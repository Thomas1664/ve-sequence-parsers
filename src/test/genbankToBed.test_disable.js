import chai from 'chai';
import path from 'path';
import fs from 'fs';
import genbankToJson from '../parsers/genbankToJson';
import jsonToBed from '../parsers/jsonToBed';

chai.should();
describe("testing genbank to json to bed file format", () => {
  it("should correctly make a bed file", async () => {
    const genbankInfo = fs.readFileSync(path.join(__dirname, './testData/genbank/AcsBmut-3pCRISPRi-242.gb'), "utf8");
    const jsonInfo = await genbankToJson(genbankInfo);
    const bedInfo = await jsonToBed(jsonInfo);
    const correctResults = fs.readFileSync(path.join(__dirname, './testData/bed/AcsBmutJsonToBed-1.bed'), "utf8");
    bedInfo.should.equal(correctResults);
  });
});
