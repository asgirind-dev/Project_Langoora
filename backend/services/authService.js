const { db, auth } = require('../config/firebase');

/**
 * Enterprise Validation Toolkit for Auth Registry Input properties
 */

const validateEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return email && emailRegex.test(email);
};

const validatePasswordPolicy = (password) => {
  if (!password) return false;
  const hasLength = password.length >= 8 && password.length <= 12;
  const hasNumeric = /[0-9]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasSpecial = /[@#$%\^&\+=]/.test(password);

  let criteriaMet = 0;
  if (hasNumeric) criteriaMet++;
  if (hasLower) criteriaMet++;
  if (hasUpper) criteriaMet++;
  if (hasSpecial) criteriaMet++;

  return hasLength && criteriaMet >= 3;
};

const validateSriLankanPhone = (phone) => {
  if (!phone) return false;
  // Format matching for +947XXXXXXXX, 07XXXXXXXX, 7XXXXXXXX without spaces
  const slPhoneRegex = /^(?:\+94|0)?7[0-9]{8}$/;
  return slPhoneRegex.test(phone.trim().replace(/\s+/g, ''));
};

const validateAgeLimit = (dob) => {
  if (!dob) return false;
  const selectedDate = new Date(dob);
  if (isNaN(selectedDate.getTime()) || selectedDate > new Date()) return false;

  const limitDate = new Date();
  limitDate.setFullYear(limitDate.getFullYear() - 15); // Minimum age: 15
  return selectedDate <= limitDate;
};

const validateFullName = (name) => {
  // Characters and spaces only, minimum 3 characters total
  return name && /^[A-Za-z\s]{3,}$/.test(name.trim());
};

module.exports = {
  validateEmail,
  validatePasswordPolicy,
  validateSriLankanPhone,
  validateAgeLimit,
  validateFullName
};