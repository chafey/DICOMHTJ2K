let dcmjs = require('dcmjs')
let fs = require('fs')
let openjphjs = require('./extern/openjphjs/dist/openjphjs.js')

const getInputFilePath = () => {
    if (process.argv.length < 3) {
        console.error('Please provide path to input DICOM P10 file');
        process.exit(1);
    }

    const filePath = process.argv[2]
    return filePath
    //return 'test/fixtures/dicomp10/CT1_UNC'
}

const getOutputFilePath = () => {
    if (process.argv.length < 4) {
        console.error('Please provide path to output DICOM P10 file');
        process.exit(1);
    }

    const filePath = process.argv[3]
    return filePath
    //return 'test/fixtures/dicomp10/CT1_UNC'
}




openjphjs.onRuntimeInitialized = async _ => {
    try {
        // get input parameters
        const inputFilePath = getInputFilePath()
        const outputFilePath = getOutputFilePath()

        //////////////////////////////////////////////////////////////////
        // READ AND PARSE THE DICOM P10 FILE 
        //////////////////////////////////////////////////////////////////

        // Read the input DICOM P10 file
        const b = fs.readFileSync(inputFilePath)
        const dicomP10 = new Uint8Array(b.buffer, b.byteOffset, b.byteLength / Uint8Array.BYTES_PER_ELEMENT);

        // Parse the DICOM P10 file and get the pixel data for the first frame
        const dicomData = dcmjs.data.DicomMessage.readFile(dicomP10.buffer);
        const meta = dcmjs.data.DicomMetaDictionary.naturalizeDataset(dicomData.meta);
        const dataset = dcmjs.data.DicomMetaDictionary.naturalizeDataset(dicomData.dict);
        const pixelData = new Uint8Array(dataset.PixelData[0])

        //////////////////////////////////////////////////////////////////
        // ENCODE THE PIXEL DATA AS HTJ2k 
        //////////////////////////////////////////////////////////////////

        // create the ImageFrame objet based on DICOM attributes of the input file
        const imageFrame = {
            width: dataset.Columns,
            height: dataset.Rows,
            bitsPerSample: dataset.BitsStored,
            componentCount: dataset.SamplesPerPixel ?? 1,
            isSigned: dataset.PixelRepresentation == 1,
            isUsingColorTransform: dataset.SamplesPerPixel === 3
        }

        // encode the pixel data to htj2k
        const encoder = new openjphjs.HTJ2KEncoder();
        const decodedBytes = encoder.getDecodedBuffer(imageFrame);
        decodedBytes.set(pixelData);
        encoder.encode();
        const encodedBytes = encoder.getEncodedBuffer();
        console.log('  encoded length=', encodedBytes.length)

        //////////////////////////////////////////////////////////////////
        // WRITE OUT DICPOM P10 FILE WITH HTJ2K PIXEL DATA 
        //////////////////////////////////////////////////////////////////
        meta.TransferSyntaxUID = { Value: ['1.2.840.10008.1.2.4.90'] } // USE JPEG2000 for now...
        dataset.PixelData[0] = encodedBytes.buffer.slice(0, encodedBytes.length)
        dataset._meta = meta
        const dicomP10New = dcmjs.data.datasetToBuffer(dataset)
        fs.writeFileSync(outputFilePath, dicomP10New)
    }
    catch (ex) {
        console.log('exception', ex)
    }
}

