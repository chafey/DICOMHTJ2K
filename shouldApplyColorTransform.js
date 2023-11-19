/**
 * Determines whether a color transform should be applied.
 * @param {Object} dataset - The DICOM dataset object.
 * @returns {Boolean} A flag indicating whether a color transform should be applied.
 */
const shouldApplyColorTransform = (dataset) => {
  return (
    dataset.SamplesPerPixel === 3 && // Must be a color image
    dataset.PhotometricInterpretation !== 'YBR_FULL' // Must not be YBR_FULL
  );
};

module.exports = shouldApplyColorTransform;
