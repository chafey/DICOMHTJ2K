const fs = require('fs');
const dcmjs = require('dcmjs');

/**
 * Writes the resulting DICOM part10 file.
 * @param {Object} dataset - The DICOM dataset object.
 * @param {Object} meta - The DICOM file meta header object.
 * @param {Boolean} isUsingColorTransform - Flag indicating whether a color transform is used.
 * @param {Array<ArrayBuffer>} encodedFrames - Array of HTJ2K encoded frame pixel data.
 * @param {string} outputFilePath - The output file path.
 */
const writeDICOMP10File = (dataset, meta, isUsingColorTransform, encodedFrames, outputFilePath) => {
  // Update the photometric interpretation
  if (isUsingColorTransform) {
    dataset.PhotometricInterpretation = 'YBR_RCT';
  }

  meta.TransferSyntaxUID = { Value: ['1.2.840.10008.1.2.4.202'] }; // HTJ2K Constrained Transfer Syntax
  dataset._meta = meta;
  dataset.PixelData = encodedFrames;
  const dicomP10New = Buffer.from(
    dcmjs.data.datasetToDict(dataset).write({ fragmentMultiframe: false })
  );
  fs.writeFileSync(outputFilePath, dicomP10New);
};

module.exports = writeDICOMP10File;
