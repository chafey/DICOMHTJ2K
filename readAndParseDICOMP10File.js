const fs = require('fs');
const dcmjs = require('dcmjs');

/**
 * Reads the input DICOM part10 file.
 * @param {string} inputFilePath - The input file path.
 * @returns {Object} The DICOM dataset and file meta header object objects.
 */
const readAndParseDICOMP10File = (inputFilePath) => {
  // Read the input DICOM P10 file
  const b = fs.readFileSync(inputFilePath);
  const dicomP10 = new Uint8Array(
    b.buffer,
    b.byteOffset,
    b.byteLength / Uint8Array.BYTES_PER_ELEMENT
  );

  // Parse the DICOM P10 file
  const dicomData = dcmjs.data.DicomMessage.readFile(dicomP10.buffer);
  const meta = dcmjs.data.DicomMetaDictionary.naturalizeDataset(dicomData.meta);
  const dataset = dcmjs.data.DicomMetaDictionary.naturalizeDataset(dicomData.dict);

  return {
    dataset,
    meta,
  };
};

module.exports = readAndParseDICOMP10File;
