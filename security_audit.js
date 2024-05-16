const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const executeSlitherAnalysis = (solidityFilePath, callback) => {
  const slitherCommand = `slither ${solidityFilePath} --json slither-report.json`;
  
  exec(slitherCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(`Slither execution error: ${error.message}`);
      return callback(error, null);
    }
    if (stderr) {
      console.error(`Slither standard error: ${stderr}`);
    }

    fs.readFile('slither-report.json', (err, data) => {
      if (err) {
        console.error(`Failed to read Slither report: ${err.message}`);
        return callback(err, null);
      }
      try {
        const report = JSON.parse(data);
        callback(null, report);
      } catch (parseErr) {
        console.error(`Failed to parse Slither JSON report: ${parseErr.message}`);
        callback(parseErr, null);
      }
    });
  });
};

const executeMythXAnalysis = (solidityFilePath, callback) => {
  const mythXCommand = `mythx analyze ${solidityFilePath} --json`;
  
  exec(mythXCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(`MythX execution error: ${error.message}`);
      return callback(error, null);
    }
    if (stderr) {
      console.error(`MythX standard error: ${stderr}`);
    }

    try {
      const report = JSON.parse(stdout);
      callback(null, report);
    } catch (parseErr) {
      console.error(`Failed to parse MythX JSON output: ${parseErr.message}`);
      callback(parseErr, null);
    }
  });
};

const auditSolidityContract = (solidityFilePath) => {
  console.log(`Auditing contract: ${solidityFilePath}`);
  
  const auditTool = process.env.SECURITY_AUDIT_TOOL || 'slither';
  const selectedAuditFunction = auditTool === 'mythx' ? executeMythXAnalysis : executeSlitherAnalysis;
  
  selectedAuditFunction(solidityFilePath, (err, auditReport) => {
    if (err) {
      console.error(`Failed to audit ${solidityFilePath} using ${auditTool}:`, err.message);
      return;
    }

    const auditReportFileName = `audit-report-${path.basename(solidityFilePath, '.sol')}-${auditTool}.json`;

    fs.writeFile(auditReportFileName, JSON.stringify(auditReport, null, 2), (writeError) => {
      if (writeError) {
        console.error(`Failed to write the audit report: ${writeError.message}`);
        return;
      }
      console.log(`Audit report generated at ${auditReportFileName}`);
    });
  });
};

// New function to list available security audit tools
const listAvailableAuditTools = () => {
  console.log("Available Security Audit Tools:");
  console.log("1. Slither");
  console.log("2. MythX");
  console.log("Set the SECURITY_AUDIT_TOOL environment variable to 'slither' or 'mythx' to choose your preferred tool.");
};

module.exports = {
  auditSolidityContract,
  listAvailableAuditTools // Exporting the new function
};