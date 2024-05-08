const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config(); 

const runSlither = (solidityFile, callback) => {
    const slitherCmd = `slither ${solidityFile} --json slither-report.json`;
    exec(slitherCmd, (error, stdout, stderr) => {
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

const runMythX = (solidityFile, callback) => {
    const mythxCmd = `mythx analyze ${solidityFile} --json`;
    exec(mythxCmd, (error, stdout, stderr) => {
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

const auditSolidityFile = (solidityFile) => {
    console.log(`Auditing file: ${solidityFile}`);
    
    const auditTool = process.env.SECURITY_AUDIT_TOOL || 'slither';

    const auditFunction = auditTool === 'mythx' ? runMythX : runSlither;
    
    auditFunction(solidityFile, (err, report) => {
        if (err) {
            console.error(`Failed to audit ${solidityFile} using ${auditTool}`, err);
            return;
        }

        const reportFile = `audit-report-${path.basename(solidityFile, '.sol')}-${auditTool}.json`;

        fs.writeFile(reportFile, JSON.stringify(report, null, 2), (writeErr) => {
            if (writeErr) {
                console.error(`Failed to write the report to ${reportFile}`, writeErr);
                return;
            }
            console.log(`Audit report generated at ${reportFile}`);
        });
    });
};