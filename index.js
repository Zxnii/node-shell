const main = () => {
    const { spawn } = require("child_process")
    const { parse } = require("shell-quote")
    const process = require("process"),
        colors = require("colors"),
        os = require("os"),
        path = require("path"),
        fs = require("fs")

    let currentlyRunning

    const commands = {
        dir: args => {
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
        exit: () => {
            process.exit(0)
        },
        cd: args => {
            if (path.isAbsolute(args[0])) {
                const fullPath = args[0]
                if (fs.statSync(fullPath).isDirectory()) {
                    process.chdir(fullPath)
                }
            } else {
                const fullPath = path.join(process.cwd(), args[0])
                if (fs.statSync(fullPath).isDirectory()) {
                    process.chdir(fullPath)
                }
            }
        },
    }

    if (os.platform != "win32") {
        delete commands.dir
    }

    const addListeners = () => {
        process.stdin.on("data", chunk => {
            processInput(chunk.toString())
        })
    }

    const createPrompt = () => {
        process.stdout.write(
            `${">".cyan} ${process.cwd().red} ${`@ ${os.hostname()}`.magenta} ${
                "$ →".cyan
            } `
        )
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
                lastChunk = chunk
                if (isRunning) {
                    process.stdout.write(chunk)
                }
            })
            running.on("exit", () => {
                isRunning = false
                process.stdout.write(lastChunk)
                currentlyRunning = undefined
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
            }
            createPrompt()
        }
    }

    const setup = () => {
        process.title = "Node Shell"
        addListeners()
        createPrompt()
    }

    setup()
}

main()
