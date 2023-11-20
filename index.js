const dcmjs = require('dcmjs');
const openjphjs = require('./extern/openjphjs/dist/openjphjs.js');
const dcmjsImaging = require('dcmjs-imaging');
const readAndParseDICOMP10File = require('./readAndParseDICOMP10File.js');
const decodePixelData = require('./decodePixelData.js');
const encodePixelData = require('./encodePixelData.js');
const writeDICOMP10File = require('./writeDICOMP10File.js');
const shouldApplyColorTransform = require('./shouldApplyColorTransform.js');

dcmjs.log.level = 'error'; // Disable annoying warnings

const getInputFilePath = () => {
  if (process.argv.length < 3) {
    console.error('Please provide path to input DICOM P10 file');
    process.exit(1);
  }

  const filePath = process.argv[2];
  return filePath;
};

const getOutputFilePath = () => {
  if (process.argv.length < 4) {
    console.error('Please provide path to output DICOM P10 file');
    process.exit(1);
  }

  const filePath = process.argv[3];
  return filePath;
};

// eslint-disable-next-line no-unused-vars
openjphjs.onRuntimeInitialized = async (_) => {
  try {
    // Get input parameters
    const inputFilePath = getInputFilePath();
    const outputFilePath = getOutputFilePath();

    // Initialize decoders
    await dcmjsImaging.NativePixelDecoder.initializeAsync();

    //////////////////////////////////////////////////////////////////
    // READ AND PARSE THE DICOM P10 FILE
    //////////////////////////////////////////////////////////////////
    const result = readAndParseDICOMP10File(inputFilePath);
    const meta = result.meta;
    const dataset = result.dataset;
    const transferSyntaxUid = meta.TransferSyntaxUID;
    const numberOfFrames = dataset.NumberOfFrames || 1;

    //////////////////////////////////////////////////////////////////
    // TRANSCODE PIXEL DATA TO HTJ2k
    //////////////////////////////////////////////////////////////////
    const isUsingColorTransform = shouldApplyColorTransform(dataset);
    const encoder = new openjphjs.HTJ2KEncoder();
    const encodedFrames = [];

    for (let i = 0; i < numberOfFrames; i++) {
      const framePixelData = decodePixelData(dataset, transferSyntaxUid, i);
      const encodedBytes = encodePixelData(encoder, framePixelData, dataset, isUsingColorTransform);

      console.log(
        'frame ',
        i,
        ' compression ratio: ',
        (framePixelData.length / encodedBytes.length).toFixed(2),
        ':1'
      );

      encodedFrames.push(
        encodedBytes.buffer.slice(
          encodedBytes.byteOffset,
          encodedBytes.byteLength + encodedBytes.byteOffset
        )
      );
    }

    //////////////////////////////////////////////////////////////////
    // WRITE OUT DICOM P10 FILE WITH HTJ2K PIXEL DATA
    //////////////////////////////////////////////////////////////////
    writeDICOMP10File(dataset, meta, isUsingColorTransform, encodedFrames, outputFilePath);
  } catch (ex) {
    console.log('exception', ex);
  }
};
