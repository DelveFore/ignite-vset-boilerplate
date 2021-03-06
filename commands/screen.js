// @cliDescription  Generates an opinionated container.
module.exports = async function (context) {
  // grab some features
  const { parameters, print, strings, ignite, filesystem } = context
  const { pascalCase, isBlank } = strings
  const config = ignite.loadIgniteConfig()

  // validation
  if (isBlank(parameters.first)) {
    print.info(`${context.runtime.brand} generate screen <name>\n`)
    print.info('A name is required.')
    return
  }

  const HEADER_TYPES = {
    Primary: 'Primary',
    Secondary: 'Secondary',
    Third: 'Third'
  }

  const headerSelection = await context.prompt.ask(
    {
      name: 'type',
      type: 'list',
      message: 'Screen Level',
      choices: [
        HEADER_TYPES.Secondary,
        HEADER_TYPES.Primary,
        HEADER_TYPES.Third
      ]
    }
  )

  const headerType = headerSelection.type
  const headerName = headerType === HEADER_TYPES.Primary ? 'MenuHeader' : 'DeeperHeader'

  const name = pascalCase(parameters.first)
  const screenName = name
  const props = { name: screenName, headerName }

  const jobs = []
  let parentScreen = null
  if (headerSelection.type === HEADER_TYPES.Third) {
    let { parent } = await context.prompt.ask({ name: 'parent', type: 'input', message: 'Parent Screen Name?' })
    jobs.push({
      template: `screen.ejs`,
      target: `src/screens/${parent}/${screenName}.js`
    })
    parentScreen = parent
  } else {
    jobs.push({
      template: `screen.ejs`,
      target: `src/screens/${screenName}/index.js`
    })
  }

  // make the templates
  await ignite.copyBatch(context, jobs, props)

  // if using `react-navigation` go the extra step
  // and insert the screen into the nav router
  if (config.navigation === 'react-navigation') {
    const navigationFile = headerType === HEADER_TYPES.Primary ? 'DrawerNavigation' : 'AppNavigation'
    const appNavFilePath = `${process.cwd()}/src/Navigation/${navigationFile}.js`
    const importFrom = parentScreen ? `'../screens/${parentScreen}/${screenName}'` : `'../screens/${screenName}'`
    const importToAdd = `import ${screenName} from ${importFrom}`
    const routeToAdd = `    ${screenName}: { screen: ${screenName} },`

    if (!filesystem.exists(appNavFilePath)) {
      const msg = `No '${appNavFilePath}' file found.  Can't insert screen.`
      print.error(msg)
      process.exit(1)
    }

    // insert screen import
    ignite.patchInFile(appNavFilePath, {
      after: `import[\\s\\D]*from\\s+'react-navigation'?`,
      insert: importToAdd
    })

    if (headerType === HEADER_TYPES.Primary) {
      // insert Sidebar
      ignite.patchInFile(`${process.cwd()}/src/components/Sidebar/index.js`, {
        after: `            \\{\\/\\* VSet Key Insert Item After \\*\\/\\}`,
        insert: '            <MenuItem icon=\'message-outline\' title=\'' + screenName.toUpperCase() + '\' onPress=\'' + screenName + '\' navigation=\'{navigation}\' />'
      })
    }

    // insert screen route
    ignite.patchInFile(appNavFilePath, {
      after: headerType === HEADER_TYPES.Primary ? 'export default DrawerNavigator\\(\n  \\{' : 'export default StackNavigator\\(\n  \\{',
      insert: routeToAdd
    })
  } else {
    print.info(`Screen ${screenName} created, manually add it to your navigation`)
  }
}
