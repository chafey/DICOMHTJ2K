# DICOMHTJ2K
DICOM HTJ2K tools

## Transcode DICOM P10 file to DICOM P10 HTJ2K

### Limitations
* Does not set the photometric interpretation properly for color images (leaves photometric interpretation as it is)
* Uses the JPEG2000 Lossless only transfer syntax (this will be updated to the official one once it is decided)

### Setup

Pull git submodues

> git submodule update --init --recursive

Install NPM Packages

> npm install

### Running

Transcode DICOM P10 file to DICOM P10 with HTJ2K data

> node index.js test/fixtures/dicomp10/CT1_UNC foo.dcm

