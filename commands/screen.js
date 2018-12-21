// @cliDescription  Generates an opinionated container.
const patterns = require('../lib/patterns')

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

  const headerType = await context.prompt.ask(
    { name: 'type', type: 'list', message: 'Screen Level', choices: ['Secondary', 'Primary'] }
  )
  const headerName = headerType === 'Primary' ? 'MenuHeader' : 'DeeperHeader'

  const name = pascalCase(parameters.first)
  const screenName = name.endsWith('Screen') ? name : `${name}`
  const props = { name: screenName, headerName }

  const jobs = [
    {
      template: `screen.ejs`,
      target: `src/screens/${screenName}/index.js`
    }
  ]

  // make the templates
  await ignite.copyBatch(context, jobs, props)

  // if using `react-navigation` go the extra step
  // and insert the screen into the nav router
  if (config.navigation === 'react-navigation') {
    const navigationFile = headerType === 'Primary' ? 'DrawerNavigation' : 'AppNavigation'
    const appNavFilePath = `${process.cwd()}/src/Navigation/${navigationFile}.js`
    const importToAdd = `import ${screenName} from '../screens/${screenName}'`
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

    // insert screen route
    ignite.patchInFile(appNavFilePath, {
      after: headerType === 'Primary' ? 'export default DrawerNavigator\\(\n  \\{' : 'export default StackNavigator\\(\n  \\{',
      insert: routeToAdd
    })
  } else {
    print.info(`Screen ${screenName} created, manually add it to your navigation`)
  }
}
