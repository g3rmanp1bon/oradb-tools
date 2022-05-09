const fs = require('fs');
var path = require('path');
data = '';

//Pass as argument the directory to analyze
// node parser.js "/Users/username/Documents/customers/xxxxx/statspack/prod"

const args = process.argv.slice(2);
var directory = args[0];

var server;
var instance;

// Lectura del directorio

fs.readdir(directory, function (err, files) {
    if (err) {
        console.error("Could not list the directory.", err);
        process.exit(1);
    }

    files.forEach(function (file, index) {
        // Make one pass and make the file complete
        var filePath = path.join(directory, file);

        fs.stat(filePath, function (error, stat) {
            if (error) {
                console.error("Error stating file.", error);
                return;
            }

            if (path.extname(filePath) == ".lst") {
                //console.log(file);

                try {
                    data = fs.readFileSync(filePath, 'utf8');
                } catch (err) {
                    console.error(err);
                }

                

                // (physical read total bytes + physical write total bytes)/1024/1024 => IOMB/s

                let PHYSICAL_READS_TOTAL_BYTES_REGXP = new RegExp(/(physical read total bytes[ #0-9,\.]{1,80})/);
                let REGXP_VALUE = new RegExp(/^.{53}(.{14})/);

                let PHYSICAL_WRITE_TOTAL_BYTES_REGXP = new RegExp(/(physical write total bytes[ #0-9,\.]{1,80})/);

                var readMB = data.match(PHYSICAL_READS_TOTAL_BYTES_REGXP)[0].match(REGXP_VALUE)[0].replace(/,/g, '').slice(54, 68).trim();
                var writeMB = data.match(PHYSICAL_WRITE_TOTAL_BYTES_REGXP)[0].match(REGXP_VALUE)[0].replace(/,/g, '').slice(54, 68).trim();

                var IOMB = (parseFloat(readMB) + parseFloat(writeMB)) / 1024 / 1024;

                // (physical write total IO requests + physical read total IO requests) = IOPS

                let PHYSICAL_WRITE_TOTAL_IO_REGXP = new RegExp(/(physical write total IO requests[ #0-9,\.]{1,80})/)
                let PHYSICAL_READ_TOTAL_IO_REGXP = new RegExp(/(physical read total IO requests[ #0-9,\.]{1,80})/)

                var readIOPS = data.match(PHYSICAL_READ_TOTAL_IO_REGXP)[0].match(REGXP_VALUE)[0].replace(/,/g, '').slice(54, 68).trim();
                var writeIOPS = data.match(PHYSICAL_WRITE_TOTAL_IO_REGXP)[0].match(REGXP_VALUE)[0].replace(/,/g, '').slice(54, 68).trim();

                var IOPS = parseFloat(readIOPS) + parseFloat(writeIOPS);
                
                // Getting the server and instance name from the filename
                server = file.split("_")[0];
                instance = file.split("_")[1].split(".")[0];

                let result = {
                    server: server,
                    instance: instance,
                    IOMB: IOMB,
                    IOPS: IOPS
                }

                console.log(result);

                const { exec } = require("child_process");

                var commando_awk="awk '/OS Statistics - detail/{flag=1;next}/IO Stat by Function/{flag=0}flag' " + filePath + "| awk '{print $5}' | sed 's/[a-z]*[A-Z]*//g' | sed 's/%//g' | sed 's/-//g' | awk NF";
                console.log("File:"+file);
                exec(commando_awk, (error, stdout, stderr) => {
                    if (error) {
                        console.log(`error: ${error.message}`);
                        return;
                    }
                    if (stderr) {
                        console.log(`stderr: ${stderr}`);
                        return;
                    }                        
                    console.log(`stdout: ${stdout}`);
                });

            }

        });
    });
});