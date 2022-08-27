# Krawall Data Extractor
This tool / script is used to extract instruments, modules and samples from games using the [GBA Sound Engine, Krawall](https://github.com/sebknzl/krawall).

It consists of 3 core scripts:
- `KrawallInstrumentExtractor`: Used to extract the Instrument data.
- `KrawallModuleExtractor`:     Used to extract the Module data.
- `KrawallSampleExtractor`:     Used to extract the Sample data.

---

## Requirements
For the example below, we make use of the following JSON Data Structure.

You can find some of them in the `DB.md` that you can copy out for your needs.

```json
{
	"addmodtable":  false,
	"binary":      "rom.gba",
	"instruments": "0x00000000",
	"krawallver":  "2005-04-21",
	"modules": [
		{ "name": "Module00", "offs": "0x00000000" }
	],
	"out":     "Game Name",
	"samples": "0x00000000"
}
```

*Now to explain a few things of what is what.*

- `addmodtable`: Specify `true`, if you want a Module Pointer table generated, so you can use `krapPlay(mod_Table[moduleIndex], 1, 0);` for example.
    - This also defines a `MOD_COUNT` to the modules header file for easier usage as well.
- `binary`: This is the path to the GBA ROM.
- `instruments`: This should either be removed (If no instruments exist), or defined as a string in hexadecimal format with the instruments pointer address.
- `krawallver`: The Krawall version in the following format: `YEAR-MONTH-DAY`.
- `modules`: A table of module *names* and *addresses* / *offsets* as a string in hexadecimal format. If no modules exist, just leave it as `"modules": [ ],`.
- `out`: The output folder where the data for the specific game gets stored.
- `samples`: This should either be removed (If no samples exist), or defined as a string in hexadecimal format with the samples pointer address.

- ***NOTE: See [Getting-Info.md](Getting-Info.md) for a little guide how to obtain the informations above using Ghidra.***

---

## Script Example
***Here is a basic implementation using Deno that you can base it on for your own project.***

<details>
	<summary>Click here to view the example.</summary>

```js
/* import the cores from Tssoret-Tools repository. */
import { KrawallInstrumentExtractor } from "https://raw.githubusercontent.com/tssoret/Tssoret-Tools/main/krawalldataextractor/cores/KrawallInstrumentExtractor.js";
import { KrawallModuleExtractor }     from "https://raw.githubusercontent.com/tssoret/Tssoret-Tools/main/krawalldataextractor/cores/KrawallModuleExtractor.js";
import { KrawallSampleExtractor }     from "https://raw.githubusercontent.com/tssoret/Tssoret-Tools/main/krawalldataextractor/cores/KrawallSampleExtractor.js";


/* Base paths. */
const krawallDataBasepath   = "data";    // Store the .S files inside data.
const krawallHeaderBasePath = "include"; // Store the .h files inside include.

/* Data Paths for Instruments, Modules and Samples. */
const instrumentsDataPath = krawallDataBasepath;              // Because Instruments only have 1 .S file, we just need them on the data root.
const modulesDataPath     = krawallDataBasepath + "/modules"; // Modules can be multiple, so store them in a modules folder.
const samplesDataPath     = krawallDataBasepath;              // Because Samples only have 1 .S file, we just need them on the data root.

/* Some other variables. */
let queueTable = [ ];
let outFolder  = "out";


/*
	Parsing the JSON for the queueTable.

	jsonPath: Path to the JSON.
*/
function parseData(jsonPath) {
	const rawData = Deno.readTextFileSync(jsonPath);
	const json    = JSON.parse(rawData);

	/* Not sure if they can be null. */
	if (json == undefined || json == null) return;

	/* A template which we pass in to queueTable on success and modify with the JSON defined data. */
	const entry = {
		addmodtable: false,
		binary:      "",
		instruments: null,
		krawallver:  "",
		modules:     [ ],
		out:         "",
		samples:     null
	};

	if (json.addmodtable == true) entry.addmodtable = true; // Only set to true if true.

	/* Ensure we have something there. */
	if (json.binary == "") return;
	entry.binary = json.binary;

	/* Can also be non existing, hence check with parseInt() and isNan(). */
	const instruments = parseInt(json.instruments, 0x10);
	if (!isNaN(instruments)) entry.instruments = instruments;

	/* Check Krawall Version. It MUST be specified. */
	if (json.krawallver == undefined || json.krawallver == "") return;
	/* check for valid version string. */
	switch(json.krawallver) {
		case "2003-09-01":
		case "2004-07-07":
		case "2004-09-17":
		case "2004-11-14":
		case "2005-04-21":
			entry.krawallver = json.krawallver;
			break;

		default:
			return;
	}

	/* Check through the Modules. */
	for (let mIdx = 0x0; mIdx < json.modules.length; mIdx++) {
		const offs = parseInt(json.modules[mIdx].offs, 0x10);
		if (!isNaN(offs)) {
			const name          = (json.modules[mIdx].name == "" ? ("Module" + mIdx.toString().padStart(0x2, "0")) : json.modules[mIdx].name);
			const modTableEntry = { name: name, offs: offs };

			entry.modules.push(modTableEntry);
		}
	}

	/* Out must be a valid out folder and is not allowed to have a slash at the end. */
	if (json.out == "" || json.out[json.out.length - 0x1] == "/") return;
	entry.out = json.out;

	/* Can also be non existing, hence check with parseInt() and isNan(). */
	const samples = parseInt(json.samples, 0x10);
	if (!isNaN(samples)) entry.samples = samples;

	queueTable.push(entry); // Push to the queue at the end if succeeded.
}


/* Parsing the provided deno arguments. */
function parseArgs() {
	const args = Deno.args;

	if (args.length > 0x0) {
		let type = "";

		for (let argIdx = 0x0; argIdx < args.length; argIdx++) {
			/* Directly switch fetch types on -i or -o. */
			if (args[argIdx] == "-i" || args[argIdx] == "-o") {
				type = args[argIdx];

			/* We don't switch types, so have sub args to a type instead. */
			} else {
				switch(type) {
					case "-i": // -i are the JSON Inputs, so parse them for queueTable.
						parseData(args[argIdx]);
						break;

					case "-o": // -o is the output directory that can be specified optionally, defaults to out.
						outFolder = args[argIdx];
						break;
				}
			}
		}
	}
}


/*
	--------------------------
	Now run the actual process.
	--------------------------
*/
parseArgs(); // Parse Deno Arguments.
if (queueTable.length == 0x0) console.log("Nothing to do here.");
else {
	if (outFolder[outFolder.length - 0x1] != "/") {
		console.log("Starting the extracting process ... Entries: " + queueTable.length.toString() + ".");

		/* Run the extracting process. */
		for (let queueIdx = 0x0; queueIdx < queueTable.length; queueIdx++) {
			const table = queueTable[queueIdx];

			/* Create the neccessary base directories. */
			Deno.mkdirSync(outFolder + "/" + table.out + "/" + modulesDataPath,       { recursive: true });
			Deno.mkdirSync(outFolder + "/" + table.out + "/" + krawallHeaderBasePath, { recursive: true });

			/* Get the DataView for the ROM Data. */
			const buffer = Deno.readFileSync(table.binary);
			const view   = new DataView(buffer.buffer);

			/* Handle Instruments (Required by Krawall). */
			{
				/* Init the Instance. */
				const instance = new KrawallInstrumentExtractor(view, table.instruments);

				/* Extract the Instrument data. */
				const instrumentData = instance.extractInstruments();
				Deno.writeTextFileSync(outFolder + "/" + table.out + "/" + instrumentsDataPath + "/instruments.S", instrumentData);

				/* Create a C / C++ compatible Header file. */
				const headerData = instance.createHeader();
				Deno.writeTextFileSync(outFolder + "/" + table.out + "/" + krawallHeaderBasePath + "/instruments.h", headerData);
			}

			/* Handle Modules (Not required by Krawall). */
			{
				/* Only handle modules, if there are any, since those are optional and don't rely on Krawall. */
				if (table.modules.length > 0x0) {
					const addModuleTable = (table.addmodtable != undefined && table.addmodtable == true);

					let cData = "";
					/* If we add the modules table, declare the krawall header, modules header and the start of the mod_Table here. */
					if (addModuleTable) {
						cData = "#include \"krawall.h\"\n";
						cData += "#include \"modules.h\"\n\n";
						cData += "const Module *mod_Table[] = { ";
					}

					let headerData = "#ifndef __MODULES_H__\n#define __MODULES_H__\n\n"; // Define the Header Guard.
					if (addModuleTable) headerData += "#define MOD_COUNT " + table.modules.length.toString() + "\n\n"; // The count is really only useful if we have the module table.

					/* Init the Instance. */
					const instance = new KrawallModuleExtractor(view, table.modules[0x0].offs, table.modules[0x0].name, table.krawallver);

					/* Ensure we provided a valid Krawall version. */
					if (instance.getKrawallValid()) {
						/* Go through all Modules and extract them all. */
						for (let mIdx = 0x0; mIdx < table.modules.length; mIdx++) {
							/* Set which Module to extract, in that case the offset + name from the Module Table. */
							instance.setModule(table.modules[mIdx].offs, table.modules[mIdx].name);

							/* Extract the Module data. */
							const modData = instance.extractModule();
							Deno.writeTextFileSync(outFolder + "/" + table.out + "/" + modulesDataPath + "/mod_" + instance.getModName() + ".S", modData);

							/* Add the define for the Header. */
							headerData += "extern const Module mod_" + instance.getModName() + ";\n";
							if (addModuleTable) {
								cData += "&mod_" + instance.getModName();

								if (mIdx < table.modules.length - 0x1) cData += ", ";
							}
						}

						/* Write the optional modules table + header. */
						if (addModuleTable) {
							cData += " };\n";
							Deno.writeTextFileSync(outFolder + "/" + table.out + "/modules.c", cData);
							headerData += "extern const Module *mod_Table[];\n";
						}

						headerData += "\n#endif\n";
						Deno.writeTextFileSync(outFolder + "/" + table.out + "/" + krawallHeaderBasePath + "/modules.h", headerData);
					}
				}
			}

			/* Handle Samples (Required by Krawall). */
			{
				/* Init the Instance. */
				const instance = new KrawallSampleExtractor(view, table.samples);

				/* Extract the Sample data. */
				const sampleData = instance.extractSamples();
				Deno.writeTextFileSync(outFolder + "/" + table.out + "/" + samplesDataPath + "/samples.S", sampleData);

				/* Create a C / C++ compatible Header file. */
				const headerData = instance.createHeader();
				Deno.writeTextFileSync(outFolder + "/" + table.out + "/" + krawallHeaderBasePath + "/samples.h", headerData);
			}

			console.log("Entry " + (queueIdx + 0x1).toString() + " out of " + queueTable.length.toString() + " is done!")
		}

	} else {
		console.log("Using a slash as the last character on the output Directory is forbidden.");
	}
}
```
</details>

---

## Running the example
***The example above requires [Deno](https://deno.land/) to be installed on your System.***

After that, you'll run `Deno run <ExampleFile>.js -i <JSON Data Files> -o <Output Folder>`.

*Replace `<ExampleFile>` with whatever file you put the example in, `<JSON Data Files>` with all your JSON's that contain the table like in the JSON Example, and `<Output Folder>` with where you want the output to be stored (by default `out`).*

... And that's it! After that is done, you should get the following output:
- `data`: Containing the `.S` files of the Samples and Instruments.
- `data/modules`: Containing all the `.S` files of the Modules.
- `include`: Containing the Samples, Instruments and Modules Header file.
- `modules.c`: If you enabled `addmodtable`, this contains the c source file that declares the modules pointer table.

***You can also implement your own Script, the example is just a little demonstration.***

---

## Script Credits
- Contributors: [SuperSaiyajinStackZ](https://github.com/SuperSaiyajinStackZ)
- Last Updated: 14. August 2022
- Purpose: Extract instruments, modules and samples from games using the [GBA Sound Engine, Krawall](https://github.com/sebknzl/krawall).
- Version: v0.1

---