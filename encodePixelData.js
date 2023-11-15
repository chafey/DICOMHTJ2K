const calculateDecompositions = require('./calculateDecompositions.js')
  
const encodePixelData = (encoder, framePixelData, dataset, isUsingColorTransform) => {
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
    encoder.setDecompositions(decompositions);
    encoder.setProgressionOrder(2) // RPCL
    encoder.setBlockDimensions({width: 64, height:64}) // block size
    encoder.setTLMMarker(true)
    encoder.setTilePartDivisionsAtResolutions(true)

    const decodedBytes = encoder.getDecodedBuffer(imageFrame);
    decodedBytes.set(framePixelData);
    encoder.encode();
    const encodedBytes = encoder.getEncodedBuffer();

    return encodedBytes
}

module.exports = encodePixelData