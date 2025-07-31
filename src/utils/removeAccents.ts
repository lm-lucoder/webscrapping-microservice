/**
 * Remove todos os acentos de uma string e transforma "ç" em "c"
 * @param str - A string da qual remover os acentos
 * @returns A string sem acentos
 */
export default function removeAccents(str: string): string {
  if (!str || typeof str !== 'string') {
    return str || '';
  }

  return str
    // Normaliza a string para decomor caracteres acentuados
    .normalize('NFD')
    // Remove todos os diacríticos (acentos)
    .replace(/[\u0300-\u036f]/g, '')
    // Transforma ç/Ç em c/C especificamente
    .replace(/[çÇ]/g, (match) => match === 'ç' ? 'c' : 'C');
}