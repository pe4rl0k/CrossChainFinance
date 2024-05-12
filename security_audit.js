const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const executeSlitherAnalysis = (solidityFilePath, callback) => {
  const slitherCommand = `slither ${solidityFilePath} --json slither-report.json`;
  
  exec(slitherCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(`Slither error: ${error}`);
      return callback(error, null);
    }
    console.log(`Slither output: ${stdout}`);
    console.error(`Slither stderr: ${stderr}`);

    fs.readFile('slither-report.json', (err, data) => {
      if (err) {
        console.error(`Failed to read Slither report: ${err}`);
        return callback(err, null);
      }
      const report = JSON.parse(data);
      callback(null, report);
    });
  });
};

const executeMythXAnalysis = (solidityFilePath, callback) => {
  const mythXCommand = `mythx analyze ${solidityFilePath} --json`;
  
  exec(mythXCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(`MythX error: ${error}`);
      return callback(error, null);
    }
    console.log(`MythX output: ${stdout}`);
    console.error(`MythX stderr: ${stderr}`);

    const report = JSON.parse(stdout);
    callback(null, report);
  });
};

const auditSolidityContract = (solidityFilePath) => {
  console.log(`Auditing contract: ${solidityFilePath}`);
  
  const auditTool = process.env.SECURITY_AUDIT_TOOL || 'slither';
  const selectedAuditFunction = auditTool === 'mythx' ? executeMythXAnalysis : executeSlitherAnalysis;
  
  selectedAuditFunction(solidityFilePath, (err, auditReport) => {
    if (err) {
      console.error(`Failed to audit ${solidityFilePath} using ${auditTool}`, err);
      return;
    }

    const auditReportFileName = `audit-report-${path.basename(solidityFilePath, '.sol')}-${auditTool}.json`;

    fs.writeFile(auditReportFileName, JSON.stringify(auditReport, null, 2), (writeError) => {
      if (writeError) {
        console.error(`Failed to write the audit report to ${auditReportFileName}`, writeError);
        return;
      }
      console.log(`Audit report generated at ${auditReportFileName}`);
    });
  });
};

module.exports = {
  auditSolidityContract
};