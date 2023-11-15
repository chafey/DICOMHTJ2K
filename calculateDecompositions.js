const calculateDecompositions = (width, height) => {
    decompositions = 0
    while(width > 64 && height > 64) {
      decompositions ++
      width = Math.floor(width/2)
      height = Math.floor(height/2)
    }
    return decompositions
}

module.exports = calculateDecompositions