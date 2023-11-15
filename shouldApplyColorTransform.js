const shouldApplyColorTransform = (dataset) => {
    return (
      dataset.SamplesPerPixel === 3 &&                    // must be a color image
      dataset.PhotometricInterpretation !== "YBR_FULL"    // must not be YBR_FULL
    )
}
  

module.exports = shouldApplyColorTransform