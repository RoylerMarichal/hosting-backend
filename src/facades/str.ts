export function  convertToSlug(text:string) {
    return text
      .toLowerCase() // Convertir a minúsculas
      .replace(/[\s\-]+/g, '-') // Reemplazar espacios y guiones con un único guion
      .replace(/[^\w\-]+/g, '') // Remover caracteres especiales
      .replace(/\-\-+/g, '-') // Remover múltiples guiones consecutivos
      .replace(/^-+|-+$/g, ''); // Remover guiones al principio y al final
  }