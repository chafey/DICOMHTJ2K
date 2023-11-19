const calculateDecompositions = require('./calculateDecompositions.js');

/**
 * Encodes frame pixel data to HTJ2K.
 * @param {Object} encoder - The HTJ2K encoder.
 * @param {Uint8Array} framePixelData -The decoded frame pixel data.
 * @param {Object} dataset - The DICOM dataset object.
 * @param {Boolean} isUsingColorTransform - Flag indicating whether a color transform is used.
 * @returns {Uint8Array} The encoded frame pixel data.
 */
const encodePixelData = (encoder, framePixelData, dataset, isUsingColorTransform) => {
  // Create the ImageFrame objet based on DICOM attributes of the input file
  const imageFrame = {
    width: dataset.Columns,
    height: dataset.Rows,
    bitsPerSample: dataset.BitsAllocated,
    componentCount: dataset.SamplesPerPixel ?? 1,
    isSigned: dataset.PixelRepresentation == 1,
    isUsingColorTransform: isUsingColorTransform,
  };

  // Calculate the number of decompositions
  const decompositions = calculateDecompositions(imageFrame.width, imageFrame.height);

  // Encode the pixel data to HTJ2K
  encoder.setDecompositions(decompositions);
  encoder.setProgressionOrder(2); // RPCL
  encoder.setBlockDimensions({ width: 64, height: 64 }); // Block size
  encoder.setTLMMarker(true);
  encoder.setTilePartDivisionsAtResolutions(true);

  const decodedBytes = encoder.getDecodedBuffer(imageFrame);
  decodedBytes.set(framePixelData);
  encoder.encode();

  return encoder.getEncodedBuffer();
};

module.exports = encodePixelData;
