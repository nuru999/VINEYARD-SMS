// Generate admission number: SCH/2026/0001
exports.generateAdmissionNumber = (schoolCode, year, sequence) => {
  return `${schoolCode}/${year}/${String(sequence).padStart(4, '0')}`;
};

// Format Kenyan phone number to 254 format
exports.formatPhoneNumber = (phone) => {
  let cleaned = phone.replace(/\s/g, '');
  if (cleaned.startsWith('0')) {
    return `254${cleaned.slice(1)}`;
  }
  if (cleaned.startsWith('+')) {
    return cleaned.slice(1);
  }
  return cleaned;
};

// Calculate 8-4-4 grade from percentage
exports.calculate844Grade = (percentage) => {
  if (percentage >= 80) return { grade: 'A', points: 12 };
  if (percentage >= 75) return { grade: 'A-', points: 11 };
  if (percentage >= 70) return { grade: 'B+', points: 10 };
  if (percentage >= 65) return { grade: 'B', points: 9 };
  if (percentage >= 60) return { grade: 'B-', points: 8 };
  if (percentage >= 55) return { grade: 'C+', points: 7 };
  if (percentage >= 50) return { grade: 'C', points: 6 };
  if (percentage >= 45) return { grade: 'C-', points: 5 };
  if (percentage >= 40) return { grade: 'D+', points: 4 };
  if (percentage >= 35) return { grade: 'D', points: 3 };
  if (percentage >= 30) return { grade: 'D-', points: 2 };
  return { grade: 'E', points: 1 };
};

// Generate unique transaction code
exports.generateTransactionCode = () => {
  return `TXN${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
};