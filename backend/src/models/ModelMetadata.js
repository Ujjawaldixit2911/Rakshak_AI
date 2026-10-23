const mongoose = require('mongoose');

const modelMetadataSchema = new mongoose.Schema({
  modelVersion: {
    type: String,
    required: true,
    unique: true
  },
  modelType: {
    type: String,
    default: 'RandomForestRiskClassifier'
  },
  trainedAt: {
    type: Date,
    default: Date.now
  },
  datasetSize: {
    type: Number,
    required: true
  },
  features: [{
    type: String
  }],
  metrics: {
    accuracy: Number,
    precision: Number,
    recall: Number,
    f1Score: Number,
    mae: Number,
    rmse: Number,
    r2: Number,
    confusionMatrix: mongoose.Schema.Types.Mixed
  },
  hyperparameters: {
    n_estimators: Number,
    max_depth: Number,
    min_samples_split: Number
  },
  isDemo: {
    type: Boolean,
    default: true
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ModelMetadata', modelMetadataSchema);
