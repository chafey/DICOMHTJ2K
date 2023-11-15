const fs = require('fs');
const dcmjs = require('dcmjs');
const openjphjs = require('./extern/openjphjs/dist/openjphjs.js');

const dcmjsImaging = require('dcmjs-imaging');

dcmjs.log.level = 'error' // disable annoying warnings

// Mimics a class not exported by dcmjs-imaging
const pixelShim = (
  width,
  height,
  bitsAllocated,
  bitsStored,
  samplesPerPixel,
  pixelRepresentation,
  planarConfiguration,
  photometricInterpretation
) => ({
  getWidth: () => width,
  getHeight: () => height,
  getBitsAllocated: () => bitsAllocated,
  getBitsStored: () => bitsStored,
  getSamplesPerPixel: () => samplesPerPixel,
  getPixelRepresentation: () => pixelRepresentation,
  getPlanarConfiguration: () => planarConfiguration,
  getPhotometricInterpretation: () => photometricInterpretation,
});

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

const getFrameBuffer = (dataset, transferSyntaxUid, frame) => {
  if (frame < 0 || frame >= dataset.NumberOfFrames) {
    throw new Error(`Requested frame is out of range [${frame}]`);
  }
  if (!dataset.PixelData) {
    throw new Error('Could not extract pixel data');
  }
  if (!dataset.Columns || !dataset.Rows) {
    throw new Error(
      `Width/height has an invalid value [w: ${dataset.Columns}, h: ${dataset.Rows}]`
    );
  }
  if (!dataset.BitsAllocated || !dataset.BitsStored) {
    throw new Error(
      `Bits allocated/stored has an invalid value [allocated: ${dataset.BitsAllocated}, stored: ${dataset.BitsStored}]`
    );
  }
  if (!dataset.PhotometricInterpretation) {
    throw new Error(
      `Photometric interpretation has an invalid value [${dataset.PhotometricInterpretation}]`
    );
  }

  const pixelBuffers = dataset.PixelData;
  if (
    transferSyntaxUid === '1.2.840.10008.1.2' || // ImplicitVRLittleEndian
    transferSyntaxUid === '1.2.840.10008.1.2.1' || // ExplicitVRLittleEndian
    transferSyntaxUid === '1.2.840.10008.1.2.1.99' // DeflatedExplicitVRLittleEndian
  ) {
    const frameSize =
      ((dataset.Columns * dataset.Rows * dataset.BitsAllocated) / 8) * dataset.SamplesPerPixel;
    const frameOffset = frameSize * frame;
    const pixelBuffer = new Uint8Array(
      Array.isArray(pixelBuffers) ? pixelBuffers.find((o) => o) : pixelBuffers
    );
    const framePixelBuffer = pixelBuffer.slice(frameOffset, frameOffset + frameSize);

    return framePixelBuffer;
  } else {
    const frameFragmentsData = new Uint8Array(pixelBuffers[frame]);
    const pixel = pixelShim(
      dataset.Columns,
      dataset.Rows,
      dataset.BitsAllocated,
      dataset.BitsStored,
      dataset.SamplesPerPixel,
      dataset.PixelRepresentation,
      dataset.PlanarConfiguration,
      dataset.PhotometricInterpretation
    );

    if (transferSyntaxUid === '1.2.840.10008.1.2.5') {
      // RleLossless
      return dcmjsImaging.NativePixelDecoder.decodeRle(pixel, frameFragmentsData);
    } else if (
      // JpegBaselineProcess1, JpegBaselineProcess2_4
      transferSyntaxUid === '1.2.840.10008.1.2.4.50' ||
      transferSyntaxUid === '1.2.840.10008.1.2.4.51'
    ) {
      return dcmjsImaging.NativePixelDecoder.decodeJpeg(pixel, frameFragmentsData, {
        convertColorspaceToRgb: true,
      });
    } else if (
      // JpegLosslessProcess14, JpegLosslessProcess14V1
      transferSyntaxUid === '1.2.840.10008.1.2.4.57' ||
      transferSyntaxUid === '1.2.840.10008.1.2.4.70'
    ) {
      return dcmjsImaging.NativePixelDecoder.decodeJpeg(pixel, frameFragmentsData);
    } else if (
      // JpegLsLossless, JpegLsLossy
      transferSyntaxUid === '1.2.840.10008.1.2.4.80' ||
      transferSyntaxUid === '1.2.840.10008.1.2.4.81'
    ) {
      return dcmjsImaging.NativePixelDecoder.decodeJpegLs(pixel, frameFragmentsData);
    } else if (
      // Jpeg2000Lossless, Jpeg2000Lossy
      transferSyntaxUid === '1.2.840.10008.1.2.4.90' ||
      transferSyntaxUid === '1.2.840.10008.1.2.4.91'
    ) {
      return dcmjsImaging.NativePixelDecoder.decodeJpeg2000(pixel, frameFragmentsData);
    }

    throw new Error(`Transfer syntax cannot be currently decoded [${transferSyntaxUid}]`);
  }
};

const calculateDecompositions =  (width, height) => {
  decompositions = 0
  while(width > 64 || height > 64) {
    decompositions ++
    width = Math.floor(width/2)
    height = Math.floor(height/2)
  }
  return decompositions
}

const applyColorTransform = (dataset) => {
  return (
    dataset.SamplesPerPixel === 3 &&                    // must be a color image
    dataset.PhotometricInterpretation !== "YBR_FULL"    // must not be YBR_FULL
  )
}


openjphjs.onRuntimeInitialized = async (_) => {
  try {
    // get input parameters
    const inputFilePath = getInputFilePath();
    const outputFilePath = getOutputFilePath();

    // initialize decoders
    await dcmjsImaging.NativePixelDecoder.initializeAsync();

    //////////////////////////////////////////////////////////////////
    // READ AND PARSE THE DICOM P10 FILE
    //////////////////////////////////////////////////////////////////

    // read the input DICOM P10 file
    const b = fs.readFileSync(inputFilePath);
    const dicomP10 = new Uint8Array(
      b.buffer,
      b.byteOffset,
      b.byteLength / Uint8Array.BYTES_PER_ELEMENT
    );

    // parse the DICOM P10 file and get the pixel data for each frame
    const dicomData = dcmjs.data.DicomMessage.readFile(dicomP10.buffer);
    const meta = dcmjs.data.DicomMetaDictionary.naturalizeDataset(dicomData.meta);
    const transferSyntaxUid = meta.TransferSyntaxUID;
    const dataset = dcmjs.data.DicomMetaDictionary.naturalizeDataset(dicomData.dict);
    const numberOfFrames = dataset.NumberOfFrames || 1;

    //////////////////////////////////////////////////////////////////
    // ENCODE THE PIXEL DATA AS HTJ2k
    //////////////////////////////////////////////////////////////////
    
    const isUsingColorTransform = applyColorTransform(dataset)
    console.log('isUsingColorTransform=', isUsingColorTransform)

    const encodedFrames = [];
    for (let i = 0; i < numberOfFrames; i++) {
      // get frame pixel data
      const framePixelData = getFrameBuffer(dataset, transferSyntaxUid, i);

      // create the ImageFrame objet based on DICOM attributes of the input file
      const imageFrame = {
        width: dataset.Columns,
        height: dataset.Rows,
        bitsPerSample: dataset.BitsStored,
        componentCount: dataset.SamplesPerPixel ?? 1,
        isSigned: dataset.PixelRepresentation == 1,
        isUsingColorTransform: isUsingColorTransform,
      };

      // calculate the number of decompositions
      const decompositions = calculateDecompositions(imageFrame.width, imageFrame.height);

      // encode the pixel data to htj2k
      const encoder = new openjphjs.HTJ2KEncoder();
      encoder.setDecompositions(decompositions);
      const decodedBytes = encoder.getDecodedBuffer(imageFrame);
      decodedBytes.set(framePixelData);
      encoder.encode();
      const encodedBytes = encoder.getEncodedBuffer();

      //console.log(`  frame=${i}, encoded length=${encodedBytes.length}`);
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

    // Update the photometric interpretation
    if(isUsingColorTransform) {
      dataset.PhotometricInterpretation = "YBR_RCT"
    }

    meta.TransferSyntaxUID = { Value: ['1.2.840.10008.1.2.4.202'] }; // HTJ2K Constrained Transfer Syntax
    dataset._meta = meta;
    dataset.PixelData = encodedFrames;
    const dicomP10New = Buffer.from(
      dcmjs.data.datasetToDict(dataset).write({ fragmentMultiframe: false })
    );
    fs.writeFileSync(outputFilePath, dicomP10New);
  } catch (ex) {
    console.log('exception', ex);
  }
};
