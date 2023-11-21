/**
 * Calculates the number of decompositions based the image width and height.
 * @param {number} width - The image width.
 * @param {number} height - The image height.
 * @returns {number} The number of decompositions.
 */
const calculateDecompositions = (width, height) => {
  let decompositions = 0;
  while (width > 64 && height > 64) {
    decompositions++;
    width = Math.ceil(width / 2);
    height = Math.ceil(height / 2);
  }

  return decompositions;
};

module.exports = calculateDecompositions;
