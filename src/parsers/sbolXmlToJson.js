/* eslint-disable no-var*/
import { parseString } from 'xml2js';

import flatmap from 'flatmap';
import access from 'safe-access';
import waldo from 'waldojs';
import validateSequenceArray from './utils/validateSequenceArray';
import addPromiseOption from './utils/addPromiseOption';

//Here's what should be in the callback:
// {
//   parsedSequence:
//   messages:
//   success: 
// }
function sbolXmlToJson(string, onFileParsedUnwrapped, options) {
    options = options || {}
    const onFileParsed = sequences => { //before we call the onFileParsed callback, we need to validate the sequence
        onFileParsedUnwrapped(validateSequenceArray(sequences, options));
    };
    let response = {
        parsedSequence: null,
        messages: [],
        success: true
    };
    try {
      parseString(string, (err, result) => {
        if (err) {
            onFileParsed({
                success: false,
                messages: ('Error parsing XML to JSON')
            });
            return;
        }
        const sbolJsonMatches = waldo.byName('DnaComponent', result);
        if (sbolJsonMatches[0]) {
            const resultArray = [];
            for (let i = 0; i < sbolJsonMatches[0].value.length; i++) {
                try {
                    response = {
                        parsedSequence: null,
                        messages: [],
                        success: true
                    };
                    response.parsedSequence = parseSbolJson(sbolJsonMatches[0].value[i], options);
                } catch (e) {
                    console.error('error:', e)
                    console.error('error.stack: ', e.stack);
                    resultArray.push({
                        success: false,
                        messages: ('Error while parsing Sbol format')
                    });
                }
                if (response.parsedSequence.features.length > 0) {
                    response.messages.push('SBOL feature types are stored in feature notes');
                }
                resultArray.push(response);
            }
            onFileParsed(resultArray);
        } else {
            onFileParsed({
                success: false,
                messages: ('XML is not valid Jbei or Sbol format')
            });
        }
      });
    } catch (e) {
      onFileParsed({
          success: false,
          messages: ('Error parsing XML to JSON')
      });
    }
}
// Converts SBOL formats.
//  * Specifications for SBOL can be found at http://www.sbolstandard.org/specification/core-data-model
//  *
//  * The hierarcy of the components in an SBOL object is:
//  *
//  *          The hierarchy is Collection -> DnaComponent -> DnaSequence
//  *
//  * Check for each level and parse downward from there.
// tnrtodo: this should be tested with a wider variety of sbol file types!
function parseSbolJson(sbolJson, options) {
    let name;
    if (access(sbolJson, 'name[0]')) {
        name = access(sbolJson, 'name[0]');
    } else {
        name = access(sbolJson, 'displayId[0]');
    }
    return {
        // circular: access(sbolJson, "seq:circular[0]"), //tnrtodo this needs to be changed
        circular: false,
        sequence: access(sbolJson, 'dnaSequence[0].DnaSequence[0].nucleotides'),
        name: name,
        features: flatmap(sbolJson.annotation, annotation => {
            const feature = access(annotation, 'SequenceAnnotation[0]');
            if (feature) {
                const notes = waldo.byName('ns2:about', feature);
                const otherNotes = waldo.byName('ns2:resource', feature);
                notes.push.apply(notes, otherNotes);
                const newNotes = {};
                notes.forEach(note => {
                    if (newNotes[note.prop]) {
                        newNotes[note.prop].push(note.value);
                    } else {
                        newNotes[note.prop] = [note.value];
                    }
                });
                let featureName;
                const nameMatches = waldo.byName('name', feature);
                if (nameMatches[0] && nameMatches[0].value && nameMatches[0].value[0]) {
                    featureName = nameMatches[0].value[0];
                } else {
                    const displayMatches = waldo.byName('displayId', feature);
                    if (displayMatches[0] && displayMatches[0].value && displayMatches[0].value[0]) {
                        featureName = displayMatches[0].value[0];
                    }
                }
                return {
                    name: featureName,
                    notes: newNotes,
                    type: 'misc_feature', // sbol represents the feature type in what we are parsing as notes as the URL is difficult to follow
                    // type: feature['seq:label'], //tnrtodo: figure out if an annotation type is passed
                    // id: feature['seq:label'],
                    start: parseInt(access(feature, 'bioStart[0]') - (options.inclusive1BasedStart ? 0 : 1)),
                    end: parseInt(access(feature, 'bioEnd[0]') - (options.inclusive1BasedEnd ? 0 : 1)),
                    strand: access(feature, 'strand[0]') //+ or -
                        // notes: feature['seq:label'],
                };
            }
        })
    };
}

export default addPromiseOption(sbolXmlToJson);