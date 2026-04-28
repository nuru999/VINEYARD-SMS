const Joi = require('joi');

exports.loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

exports.createStudentSchema = Joi.object({
  firstName: Joi.string().min(2).max(100).required(),
  lastName: Joi.string().min(2).max(100).required(),
  admissionNumber: Joi.string().optional(),
  gender: Joi.string().valid('male', 'female', 'other').required(),
  dateOfBirth: Joi.date().iso().required(),
  curriculum: Joi.string().valid('8-4-4', 'cbc').required(),
  currentGrade: Joi.string().required(),
  stream: Joi.string().optional(),
  boardingStatus: Joi.string().valid('day', 'boarding').default('day')
});

exports.grade844Schema = Joi.object({
  assessmentId: Joi.string().uuid().required(),
  grades: Joi.array().items(
    Joi.object({
      studentId: Joi.string().uuid().required(),
      score: Joi.number().min(0).max(100).required(),
      remarks: Joi.string().max(500).optional()
    })
  ).required()
});

exports.gradeCBCSchema = Joi.object({
  assessmentId: Joi.string().uuid().required(),
  grades: Joi.array().items(
    Joi.object({
      studentId: Joi.string().uuid().required(),
      subStrandId: Joi.string().uuid().required(),
      competencyLevel: Joi.string().valid('EE', 'ME', 'AE', 'BE').required(),
      observations: Joi.string().max(1000).optional()
    })
  ).required()
});