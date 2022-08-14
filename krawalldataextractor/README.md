# Krawall Data Extractor
This tool / script is used to extract instruments, modules and samples from games using the [GBA Sound Engine, Krawall](https://github.com/sebknzl/krawall).

It consists of 3 core scripts:
- `KrawallInstrumentExtractor`: Used to extract the Instrument data.
- `KrawallModuleExtractor`:     Used to extract the Module data.
- `KrawallSampleExtractor`:     Used to extract the Sample data.

All of them are at the end used in the script `KrawallDataExtractor.js`.

---

## Requirements
To properly use Krawall Data Extractor, you need to provide the following information in form of a JSON file.
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
    - ***NOTE2: There are some JSON files provided already that should be pretty much ready to be used in the `db` directory. You'd just need to modify `binary` to the Path of your ROM.***

---

## Running Krawall Data Extractor
***The following script requires [Deno](https://deno.land/) to be installed on your System.***

After that, you'll run `Deno run KrawallDataExtractor.js -i <JSON Data Files> -o <Output Folder>`.

*Replace `<JSON Data Files>` with all your JSON's that contain the table like in the example, and `<Output Folder>` with where you want the output to be stored (by default `out`).*

... And that's it! After that is done, you should get the following output:
- `data`: Containing the `.S` files of the Samples and Instruments.
- `data/modules`: Containing all the `.S` files of the Modules.
- `include`: Containing the Samples, Instruments and Modules Header file.
- `modules.c`: If you enabled `addmodtable`, this contains the c source file that declares the modules pointer table.

---

## Script Credits
- Contributors: [SuperSaiyajinStackZ](https://github.com/SuperSaiyajinStackZ)
- Last Updated: 14. August 2022
- Purpose: Extract instruments, modules and samples from games using the [GBA Sound Engine, Krawall](https://github.com/sebknzl/krawall).
- Version: v0.1

---