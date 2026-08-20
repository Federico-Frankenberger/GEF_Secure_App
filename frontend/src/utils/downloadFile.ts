/** Dispara la descarga de un Blob (ej: PDF de la seccion Informes) sin depender
 *  de que el backend controle la navegacion -- crea un <a download> efímero. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
