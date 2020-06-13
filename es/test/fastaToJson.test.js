/**
 * testing file for the FASTA parser, which should be able to handle multiple sequences in the same file, comments, and any other sort of vaild FASTA format
 * @author Joshua P Nixon
 */
import fastaToJson from '../parsers/fastaToJson';

import path from 'path';
import fs from 'fs';
import chai from 'chai';
import { proteinFasta3 } from './resultStrings';
chai.use(require("chai-things"));
chai.should();

describe("FASTA tests", () => {
  it("import protein fasta file without replacing spaces to underscore in name", done => {
    const string = fs.readFileSync(
      path.join(__dirname, "./testData/fasta/proteinFasta.fas"),
      "utf8"
    );
    fastaToJson(
      string,
      result => {
        result[0].parsedSequence.name.should.equal("gi");
        result[0].parsedSequence.description.should.equal(
          "359950697|gb|AEV91138.1| Rfp (plasmid) [synthetic construct]"
        );
        result[0].parsedSequence.sequence.should.equal(
          "MRSSKNVIKEFMRFKVRMEGTVNGHEFEIEGEGEGRPYEGHNTVKLKVTKGGPLPFAWDILSPQFQYGSKVYVKHPADIPDYKKLSFPEGFKWERVMNFEDGGVVTVTQDSSLQDGCFIYKVKFIGVNFPSDGPVMQKKTMGWEASTERLYPRDGVLKGEIHKALKLKDGGHYLVEFKSIYMAKKPVQLPGYYYVDSKLDITSHNEDYTIVEQYERTEGRHHLFL"
        );
        done();
      },
      {
        isProtein: true
      }
    );
  });
  it("should respect the additionalValidChars option!", async () => {
    const res = await fastaToJson(
      `>thomasFastaWithDashes
gacta --- asdf-c-a
`,
      { additionalValidChars: "f-" }
    );
    res[0].parsedSequence.sequence.should.equal("gacta---asdf-c-a");
  });
  it("tests a basic fasta file", done => {
    const string = fs.readFileSync(
      path.join(__dirname, "./testData/fasta/example.fas"),
      "utf8"
    );
    fastaToJson(string, result => {
      result[0].parsedSequence.name.should.equal("ssrA_tag_enhance");
      result[0].parsedSequence.sequence.should.equal("GTAAGT");
      done();
    });
  });
  it("test a multiFASTA", done => {
    const string = fs.readFileSync(
      path.join(__dirname, "./testData/fasta/multi_test.fas"),
      "utf8"
    );
    fastaToJson(string, result => {
      result.length.should.equal(7);
      result.should.include.something.that.deep.equals({
        parsedSequence: {
          sequence: "GTCA",
          features: [],
          name: "Sequence_5",
          extraLines: [],
          size: 4,
          circular: false,
          comments: [],
          type: "DNA"
        },
        success: true,
        messages: []
      });
      result.should.include.something.that.deep.equals({
        parsedSequence: {
          name: "Sequence_1",
          sequence: "ACTG",
          size: 4,
          circular: false,
          extraLines: [],
          features: [],
          comments: [],
          type: "DNA"
        },
        success: true,
        messages: []
      });
      result.should.include.something.that.deep.equals({
        parsedSequence: {
          name: "Sequence_7",
          sequence: "GTCA",
          size: 4,
          extraLines: [],
          circular: false,
          features: [],
          comments: [],
          type: "DNA"
        },
        success: true,
        messages: []
      });
      done();
    });
  });
  it("tests an old-style FASTA", done => {
    const string = fs.readFileSync(
      path.join(__dirname, "./testData/fasta/oldstyle.fas"),
      "utf8"
    );
    fastaToJson(string, result => {
      result[0].parsedSequence.sequence.should.equal("actGacgata");
      // result[0].parsedSequence.name.should.equal('my_NAME'); // TODO: should bars be allowed? they have meaning (though the meaning is not consistent across all FASTA files)
      done();
    });
  });
  it("tests FASTA with a large single line", done => {
    const string = fs.readFileSync(
      path.join(__dirname, "./testData/fasta/pBbS8c_RFP.fas"),
      "utf8"
    );
    fastaToJson(string, result => {
      result[0].parsedSequence.sequence.length.should.equal(5213);
      done();
    });
  });
  it("tests protein FASTA and checks for correctness", done => {
    const string = fs.readFileSync(
      path.join(__dirname, "./testData/fasta/proteinFasta3.fasta"),
      "utf8"
    );
    fastaToJson(string, result => {
      result[0].parsedSequence.sequence.should.equal(proteinFasta3);
      done();
    }, {
      isProtein: true
    });
  });
  it("handles the option to guessIfProtein correctly", done => {
    const string = fs.readFileSync(
      path.join(__dirname, "./testData/fasta/proteinFasta2.fasta"),
      "utf8"
    );
    fastaToJson(
      string,
      result => {
        result[0].parsedSequence.type.should.equal("PROTEIN");
        done();
      },
      { guessIfProtein: true }
    );
  });
  it("handles the parseFastaAsCircular option correctly", done => {
    fastaToJson(
      `>mySeq1
gtagagtagagagagg
      `,
      result => {
        result[0].parsedSequence.circular.should.equal(true)
        done();
      },
      { parseFastaAsCircular: true }
    );
  });
});
