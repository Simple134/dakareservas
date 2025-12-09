export const formatCedula = (value: string) => {
  // Strip all non-numeric characters
  const digits = value.replace(/\D/g, '').slice(0, 11);
  
  let res = "";
  
  if (digits.length > 0) {
    res = digits.slice(0, 3);
  }
  if (digits.length > 3) {
    res += "-" + digits.slice(3, 10);
  }
  if (digits.length > 10) {
    res += "-" + digits.slice(10, 11);
  }
  
  return res;
};
