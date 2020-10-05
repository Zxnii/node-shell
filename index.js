const main = () => {
    const { spawn } = require("child_process")
    const { parse } = require("shell-quote")
    const process = require("process"),
        colors = require("colors"),
        os = require("os"),
        path = require("path"),
        fs = require("fs"),
        readline = require("readline")
    const commandHistory = []
    let prompt = `${">".cyan} ${process.cwd().red} ${
        `@ ${os.hostname()}`.magenta
    } ${"$ →".cyan} `

    let currentlyRunning

    const commands = {
        dir: args => {
            if (!args[0]) args[0] = ""
            if (path.isAbsolute(args[0])) {
                const fullPath = args[0]
                if (fs.statSync(fullPath).isDirectory()) {
                    const contents = fs.readdirSync(fullPath)
                    for (const entry of contents) {
                        try {
                            const entryPath = path.join(fullPath, entry)
                            const dir = fs.statSync(entryPath).isDirectory()
                            const date = fs.statSync(entryPath).mtime
                            const formatted = new Intl.DateTimeFormat("en", {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "numeric",
                                second: "numeric",
                                hour12: false,
                            })
                                .format(date)
                                .replace(/\//g, "-")
                            process.stdout.write(
                                `${formatted} ${
                                    dir ? "<DIR> " : "<FILE>"
                                } ${entry}\n`
                            )
                        } catch (err) {
                            continue
                        }
                    }
                } else {
                    process.stdout.write(
                        `The path specified ${fullPath} is not a directory\n`
                            .red
                    )
                }
            } else {
                const fullPath = path.join(process.cwd(), args[0])
                if (fs.statSync(fullPath).isDirectory()) {
                    const contents = fs.readdirSync(fullPath)
                    for (const entry of contents) {
                        try {
                            const entryPath = path.join(fullPath, entry)
                            const dir = fs.statSync(entryPath).isDirectory()
                            const date = fs.statSync(entryPath).mtime
                            const formatted = new Intl.DateTimeFormat("en", {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "numeric",
                                second: "numeric",
                                hour12: false,
                            })
                                .format(date)
                                .replace(/\//g, "-")
                            process.stdout.write(
                                `${formatted} ${
                                    dir ? "<DIR> " : "<FILE>"
                                } ${entry}\n`
                            )
                        } catch (err) {
                            continue
                        }
                    }
                } else {
                    process.stdout.write(
                        `The path specified ${fullPath} is not a directory\n`
                            .red
                    )
                }
            }
        },
        exit: args => {
            if (args[0]) process.exit(args[0])
            else process.exit(commandHistory[commandHistory.length - 1].code)
        },
        cd: args => {
            if (path.isAbsolute(args[0])) {
                const fullPath = args[0]
                if (!fs.existsSync(fullPath)) {
                    process.stdout.write(
                        `Could not find the directory specified (${fullPath}).\n`
                            .red
                    )
                    return
                }
                if (fs.statSync(fullPath).isDirectory()) {
                    process.chdir(fullPath)
                }
            } else {
                const fullPath = path.join(process.cwd(), args[0])
                if (!fs.existsSync(fullPath)) {
                    process.stdout.write(
                        `Could not find the directory specified (${fullPath}).\n`
                            .red
                    )
                    return
                }
                if (fs.statSync(fullPath).isDirectory()) {
                    process.chdir(fullPath)
                }
            }
        },
        cls: () => {
            process.stdout.write("\u001b[2J\u001b[0;0H")
        },
        history: () => {
            for (const item of commandHistory)
                process.stdout.write(
                    `Command: '${item.command}' args: '${item.args}'\n`
                )
        },
    }

    if (os.platform != "win32") {
        delete commands.dir
        delete commands.cls
    }

    const addListeners = () => {
        process.stdin.setRawMode(true)
        const reader = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt,
        })
        reader.on("line", line => {
            processInput(line)
        })
        readline.emitKeypressEvents(process.stdin, reader)

        process.stdin.on("keypress", (chr, key) => {
            reader.setPrompt(prompt)
        })
    }

    const createPrompt = () => {
        prompt = `${">".cyan} ${process.cwd().red} ${
            `@ ${os.hostname()}`.magenta
        } ${"$ →".cyan} `
        process.stdout.write(prompt)
    }

    const processInput = input => {
        if (currentlyRunning) {
            currentlyRunning.stdin.write(input)
            return
        }

        const parsed = parse(input)
        const command = parsed[0]
        const args = []
        for (const arg of parsed) {
            if (arg != command) args.push(arg)
        }

        const $path = process.env.PATH.split(";")

        let spawnCommand = ""

        if (os.platform() == "win32") {
            if (fs.existsSync(path.join(process.cwd(), `${command}.exe`))) {
                spawnCommand = path.join(process.cwd(), `${command}.exe`)
            }
            if (fs.existsSync(path.join(process.cwd(), `${command}.cmd`))) {
                spawnCommand = path.join(process.cwd(), `${command}.cmd`)
            }
        } else {
            if (fs.existsSync(path.join(process.cwd(), command))) {
                spawnCommand = path.join(process.cwd(), command)
            }
        }

        if (spawnCommand == "") {
            for (const entry of $path) {
                if (os.platform() == "win32") {
                    if (fs.existsSync(path.join(entry, `${command}.exe`))) {
                        spawnCommand = path.join(entry, `${command}.exe`)
                        break
                    }
                    if (fs.existsSync(path.join(entry, `${command}.cmd`))) {
                        spawnCommand = path.join(entry, `${command}.cmd`)
                        break
                    }
                } else {
                    if (fs.existsSync(path.join(entry, command))) {
                        spawnCommand = path.join(entry, command)
                        break
                    }
                }
            }
        }

        try {
            const running = spawn(spawnCommand, args, {
                PATH: process.env.PATH,
                windowsHide: true,
            })
            let isRunning = true
            currentlyRunning = running
            running.on("error", err => {
                currentlyRunning = undefined
                process.stdout.write(
                    `The command "${command}" is not an external or internal command.\n`
                        .red
                )
                running.kill("SIGKILL")
                createPrompt()
            })
            running.stdout.on("data", chunk => {
                lastChunk = chunk.toString()
                if (isRunning) {
                    lastChunk = ""
                    process.stdout.write(chunk)
                }
            })
            running.on("exit", code => {
                isRunning = false
                process.stdout.write(`${lastChunk}`)
                currentlyRunning = undefined
                commandHistory.push({
                    command,
                    args,
                    code,
                })
                createPrompt()
            })
        } catch (err) {
            if (!commands[command]) {
                process.stdout.write(
                    `The command "${command}" is not an external or internal command.\n`
                        .red
                )
            } else {
                commands[command](args)
                commandHistory.push({
                    command,
                    args,
                    code: 0,
                })
            }
            createPrompt()
        }
    }

    const setup = () => {
        process.stdout.write(
            `Node Shell version ${
                require("./package.json").version.green
            } running Node.js version ${process.version.green}\n\n`
        )
        process.title = "Node Shell"
        addListeners()
        createPrompt()
    }

    setup()
}

main()
