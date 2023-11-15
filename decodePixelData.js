const dcmjsImaging = require('dcmjs-imaging');

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
  

const decodePixelData = (dataset, transferSyntaxUid, frame) => {
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
  
  module.exports = decodePixelData