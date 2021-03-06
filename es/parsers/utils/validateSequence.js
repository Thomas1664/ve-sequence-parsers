var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

import areNonNegativeIntegers from "validate.io-nonnegative-integer-array";
import { FeatureTypes } from "ve-sequence-utils";
import NameUtils from "./NameUtils.js";
import { filterAminoAcidSequenceString, filterSequenceString, guessIfSequenceIsDnaAndNotProtein } from "ve-sequence-utils";
import { upperFirst } from "lodash";
import pragmasAndTypes from "./pragmasAndTypes.js";

//validation checking
/**
 * validation and sanitizing of our teselagen sequence data type
 * @param  {object} sequence Our teselagen sequence data type
 * @return response         {
    validatedAndCleanedSequence: {},
    messages: [],
  };
 */
export default function validateSequence(sequence) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var isProtein = options.isProtein,
      guessIfProtein = options.guessIfProtein,
      guessIfProteinOptions = options.guessIfProteinOptions,
      reformatSeqName = options.reformatSeqName,
      inclusive1BasedStart = options.inclusive1BasedStart,
      inclusive1BasedEnd = options.inclusive1BasedEnd,
      additionalValidChars = options.additionalValidChars;

  var response = {
    validatedAndCleanedSequence: {},
    messages: []
  };
  if (!sequence || (typeof sequence === "undefined" ? "undefined" : _typeof(sequence)) !== "object") {
    throw new Error("Invalid sequence");
  }
  if (!sequence.name) {
    //we'll handle transferring the file name outside of this function
    //for now just set it to a blank string
    sequence.name = "";
  }
  if (!sequence.extraLines) {
    sequence.extraLines = [];
  }
  if (!sequence.comments) {
    sequence.comments = [];
  }
  var oldName = sequence.name;
  if (reformatSeqName) {
    sequence.name = NameUtils.reformatName(sequence.name);
  }
  if (oldName !== sequence.name) {
    response.messages.push("Name (" + oldName + ") reformatted to " + sequence.name);
  }

  if (Array.isArray(sequence.sequence)) {
    sequence.sequence = sequence.sequence.join("");
  }
  if (!sequence.sequence) {
    response.messages.push("No sequence detected");
    sequence.sequence = "";
  }
  var validChars = void 0;
  if (isProtein === undefined && guessIfProtein) {
    isProtein = !guessIfSequenceIsDnaAndNotProtein(sequence.sequence, guessIfProteinOptions);
  }
  if (isProtein) {
    //tnr: add code to strip invalid protein data..
    validChars = filterAminoAcidSequenceString(sequence.sequence);
    if (validChars !== sequence.sequence) {
      sequence.sequence = validChars;
      response.messages.push("Import Error: Illegal character(s) detected and removed from amino acid sequence. Allowed characters are: xtgalmfwkqespvicyhrndu");
    }
    sequence.type = "PROTEIN";
    sequence.isProtein = true;
    if (!sequence.proteinSequence) {
      sequence.proteinSequence = sequence.sequence;
    }
    sequence.proteinSize = sequence.proteinSequence.length;
  } else {
    //todo: this logic won't catch every case of RNA, so we should probably handle RNA conversion at another level..
    var newSeq = sequence.sequence.replace(/u/g, "t");
    newSeq = newSeq.replace(/U/g, "T");
    if (newSeq !== sequence.sequence) {
      sequence.type = "RNA";
      sequence.sequence = newSeq;
    } else {
      sequence.type = "DNA";
    }

    validChars = filterSequenceString(sequence.sequence, additionalValidChars);
    if (validChars !== sequence.sequence) {
      sequence.sequence = validChars;
      response.messages.push("Import Error: Illegal character(s) detected and removed from sequence. Allowed characters are: atgcyrswkmbvdhn");
    }
  }

  if (!sequence.size) {
    sequence.size = isProtein ? sequence.proteinSequence.length * 3 : sequence.sequence.length;
  }
  var circularityExplicitlyDefined = void 0;
  if (sequence.circular === false || sequence.circular === "false" || sequence.circular === -1) {
    sequence.circular = false;
  } else if (!sequence.circular) {
    sequence.circular = false;
    circularityExplicitlyDefined = false;
  } else {
    sequence.circular = true;
  }

  if (!sequence.features || !Array.isArray(sequence.features)) {
    response.messages.push("No valid features detected");
    sequence.features = [];
  }
  //tnr: maybe this should be wrapped in its own function (in case we want to use it elsewhere)
  sequence.features = sequence.features.filter(function (feature) {
    if (!feature || (typeof feature === "undefined" ? "undefined" : _typeof(feature)) !== "object") {
      response.messages.push("Invalid feature detected and removed");
      return false;
    }
    feature.start = parseInt(feature.start, 10);
    feature.end = parseInt(feature.end, 10);

    if (!feature.name || typeof feature.name !== "string") {
      response.messages.push('Unable to detect valid name for feature, setting name to "Untitled Feature"');
      feature.name = "Untitled Feature";
    }
    if (!areNonNegativeIntegers([feature.start]) || feature.start > sequence.size - (inclusive1BasedStart ? 0 : 1)) {
      response.messages.push("Invalid feature start: " + feature.start + " detected for " + feature.name + " and set to 1"); //setting it to 0 internally, but users will see it as 1
      feature.start = 0;
    }
    if (!areNonNegativeIntegers([feature.end]) || feature.end > sequence.size - (inclusive1BasedEnd ? 0 : 1)) {
      response.messages.push("Invalid feature end:  " + feature.end + " detected for " + feature.name + " and set to 1"); //setting it to 0 internally, but users will see it as 1
      feature.end = Math.max(sequence.size - 1, inclusive1BasedEnd ? 0 : 1);
      // feature.end = 0;
    }

    if (feature.start - (inclusive1BasedStart ? 0 : 1) > feature.end - (inclusive1BasedEnd ? 0 : 1) && sequence.circular === false) {
      if (circularityExplicitlyDefined) {
        response.messages.push("Invalid circular feature detected in explicitly linear sequence. " + feature.name + ". start set to 1"); //setting it to 0 internally, but users will see it as 1
        feature.start = 0;
      } else {
        response.messages.push("Circular feature detected in implicitly linear sequence. Setting sequence to be circular.");
        sequence.circular = true;
      }
    }

    feature.strand = parseInt(feature.strand, 10);
    if (feature.strand === -1 || feature.strand === false || feature.strand === "false" || feature.strand === "-") {
      feature.strand = -1;
    } else {
      feature.strand = 1;
    }
    var invalidFeatureType = void 0;
    if (!feature.type || typeof feature.type !== "string" || !FeatureTypes.some(function (featureType) {
      if (featureType.toLowerCase() === feature.type.toLowerCase()) {
        feature.type = featureType; //this makes sure the feature.type is being set to the exact value of the accepted featureType
        return true;
      }
      return false;
    })) {
      response.messages.push('Invalid feature type detected:  "' + feature.type + '" within ' + feature.name + ". set type to misc_feature");
      if (typeof feature.type === "string") {
        invalidFeatureType = feature.type;
      }
      feature.type = "misc_feature";
    }
    if (!feature.notes) {
      feature.notes = {};
    }
    //if the original feature type was invalid, push it onto the notes object under featureType
    if (invalidFeatureType) {
      if (!feature.notes.featureType) {
        feature.notes.featureType = [];
      }
      feature.notes.featureType.push(invalidFeatureType);
    }
    if (feature.notes.label) {
      //we've already used the label as the name by default if both gene and label were present
      delete feature.notes.label;
    } else if (feature.notes.gene) {
      //gene was useds for name (if it existed)
      delete feature.notes.gene;
    } else if (feature.notes.name) {
      //name was used for name (if it existed)
      delete feature.notes.name;
    }
    if (feature.notes.color) {
      feature.color = feature.notes.color[0] || feature.color;
      delete feature.notes.color;
    }
    if (feature.notes.labelColor) {
      feature.labelColor = feature.notes.labelColor[0] || feature.labelColor;
      delete feature.notes.labelColor;
    }

    for (var _iterator = pragmasAndTypes, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
      var _ref2;

      if (_isArray) {
        if (_i >= _iterator.length) break;
        _ref2 = _iterator[_i++];
      } else {
        _i = _iterator.next();
        if (_i.done) break;
        _ref2 = _i.value;
      }

      var _ref = _ref2;
      var pragma = _ref.pragma,
          type = _ref.type;

      if (options["accept" + upperFirst(type)] !== false && //acceptParts, acceptWarnings,
      feature.notes.pragma && feature.notes.pragma[0] === pragma) {
        if (!sequence[type]) {
          sequence[type] = []; //initialize an empty array if necessary
        }
        feature.type = type.slice(0, -1); //set the type before pushing it onto the array
        delete feature.notes.pragma;
        sequence[type].push(feature);
        return false; //don't include the features
      }
    }
    return true;
  });
  response.validatedAndCleanedSequence = sequence;
  return response;
}