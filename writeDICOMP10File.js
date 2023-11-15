const fs = require('fs');
const dcmjs = require('dcmjs');

const writeDICOMP10File = (isUsingColorTransform, dataset, meta, encodedFrames, outputFilePath) => {
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
}

module.exports = writeDICOMP10File