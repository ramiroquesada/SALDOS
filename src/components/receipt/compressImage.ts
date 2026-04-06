/**
 * Compresses an image file using Canvas API.
 * Resizes to max 1200px on the longest side, outputs JPEG at 0.75 quality.
 * Runs entirely in the browser — no external libraries.
 */
export async function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      const MAX = 1200
      let { width, height } = img

      if (width > MAX || height > MAX) {
        const ratio = Math.min(MAX / width, MAX / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          const outputName = file.name.replace(/\.[^.]+$/, '.jpg')
          resolve(new File([blob!], outputName, { type: 'image/jpeg' }))
        },
        'image/jpeg',
        0.75
      )
    }

    img.src = objectUrl
  })
}
