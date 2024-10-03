const SupernovaTokenMap = {
    color: "Color",
    size: "Measure",
    space: "Measure",
    font: "Typography",
    borderRadius: "Measure",
    shadow: "Shadow",
    borderWidth: "Measure",
    gradient: "Gradient",
    motionDuration: "GenericToken",
    motionEasing: "GenericToken",
}

const swiftTypeForSupernovaType = {
    Measure: "CGFloat",
    Color: "UIColor",
    Typography: "PrismTypography",
    Radius: "CGFloat",
    Shadow: "PrismShadow",
    Gradient: "LinearGradient",
    GenericToken: "String",
}

// Categories and tiers of our tokens that we will be generating/accessing
const categoriesAndTiers = [
    // Tiers
    "base",
    "usage",
    "comp",
]

// This function takes in a pathEntry from a token and checks to make sure it is
// something we would want to use as part of the path for our generated tokens.
function isValidPathEntry(pathEntry, index) {
    if (index > 0) {
        return true
    }
    for (let i = 0; i < categoriesAndTiers.length; i++) {
        if (pathEntry === categoriesAndTiers[i]) {
            return true
        }
    }
    return false
}

const getTokenPath = (token) => {
    let path = token.parent.path
    if (path.length >= 2) {
        if (path[0] === path[1]) path = path.slice(1)
    }
    const pathToToken = [...path].filter(isValidPathEntry)
    return [...pathToToken, token.parent.name, token.name]
}

const filterTokenPathForType = (typeName, tokens) => {
    for (let token of tokens) {
        const tokenPath = getTokenPath(token)
    }
    return tokens.filter((token) => {
        const tokenPath = getTokenPath(token)
        if (typeName == "shadow") {
            return tokenPath[1] == "elevation"
        }
        if (typeName == "borderRadius") {
            return tokenPath[1] == "border-radius"
        }
        if (typeName == "borderWidth") {
            return tokenPath[1] == "border-width"
        }
        if (typeName == "font") {
            return tokenPath[1] == "type"
        }
        if (typeName == "color" && tokenPath.includes("gradient")) {
            return false
        }
        if (typeName == "gradient") {
            return token.value.type == "Linear"
        }
        if (typeName == "motionDuration") {
            return tokenPath[1] == "motion" && tokenPath[2] != "easing"
        }
        if (typeName == "motionEasing") {
            return tokenPath[1] == "motion" && tokenPath[2] == "easing"
        }
        return tokenPath[1] == typeName
    })
}

Pulsar.registerFunction("filterTokenPathForType", filterTokenPathForType)

Pulsar.registerFunction("getThemeTokens", function(theme) {
    return theme.overriddenTokens ? theme.overriddenTokens : theme
})

Pulsar.registerFunction("providerSwiftProtocolForTokenType", function(type) {
    return `var ${friendlyNameForType(type, false)}TokenProvider: ${tokenProviderNameForType(type)}`
})

Pulsar.registerFunction("providerSwiftForTokenType", function(type, theme) {
    return `let ${friendlyNameForType(type, false)}TokenProvider: ${tokenProviderNameForType(type)} = ${tokenProviderNameForType(type, theme.name)}()`
})

const friendlyNameForType = (type, isUpperCase) => {
    if (isUpperCase) {
        return `${type.charAt(0).toUpperCase() + type.slice(1)}`
    } else {
        return `${type.charAt(0).toLowerCase() + type.slice(1)}`
    }
}

Pulsar.registerFunction("friendlyNameForType", friendlyNameForType)

const tokenProviderNameForType = (type, theme) => {
    let typeName = ""
    if (type) {
        typeName = friendlyNameForType(type, true)
    }
    return `Prism${theme ? theme : ""}${typeName}TokenProvider`
}

Pulsar.registerFunction("tokenProviderNameForType", tokenProviderNameForType)

const themeProviderName = (theme) => {
    return `Prism${theme}ThemeProvider`
}

Pulsar.registerFunction("themeProviderName", themeProviderName)

Pulsar.registerFunction("swiftProtocolVariableForToken", function(token) {
    return `var ${variableNameForToken(token)}: ${swiftTypeForSupernovaType[token.tokenType]}`
})

Pulsar.registerFunction("swiftVariableForToken", function(token, theme) {
    let value = `${swiftTypeForSupernovaType[token.tokenType]} { ${variableDefinitionForType(token, theme)} }`;
    let variableDeclaration = `var ${variableNameForToken(token)}: ${value}`
    let themeName = theme.name ? theme.name : "Default"
    if (themeName == "Default") {
        let comment = `/// The default extension value for \`${variableNameForToken(token)}\`.
    ///
    /// This provides the value for the default DoorDash theme and is overridden as needed in subsequent theme definitions.
    ///
    /// The value is of type \`${swiftTypeForSupernovaType[token.tokenType]}\` and is defined as:
    /**
    \`\`\`swift
    { ${variableDefinitionForType(token, theme)} }
    \`\`\`
    */`;
        return comment + "\n    " + variableDeclaration
    }
    return variableDeclaration
})

const variableDefinitionForType = (token, theme) => {
    if (token.tokenType == "Color") {
        return colorTokenDefinition(token.value, token.darkValue, theme)
    } else if (token.tokenType == "Shadow") {
        return shadowTokenDefinition(token, theme)
    } else if (token.tokenType == "Measure") {
        return measureTokenDefinition(token, theme)
    } else if (token.tokenType == "Radius") {
        return radiusTokenValue(token, theme)
    } else if (token.tokenType == "Typography") {
        return typographyTokenDefinition(token, theme)
    } else if (token.tokenType == "Gradient") {
        return gradientTokenDefinition(token, theme)
    } else if (token.tokenType == "GenericToken") {
        return motionTokenDefinition(token, theme)
    }
    return ""
}

const motionTokenDefinition = (token, theme) => {
    if (token.value.referencedToken) {
        return referencedValueForTokenValue(token.value, theme)
    }
    return `"${token.value.text}"`
}

const measureTokenDefinition = (token, theme) => {
    if (token.value.referencedToken) {
        return referencedValueForTokenValue(token.value, theme)
    }
    return token.value.measure
}

const radiusTokenValue = (token, theme) => {
    if (token.value.referencedToken) {
        return referencedValueForTokenValue(token.value, theme)
    }
    return token.value.radius.measure
}

const referencedValueForTokenValue = (value, theme) => {
    const referenceName = variableNameForToken(value.referencedToken)
    if (referenceName.includes("base") && referenceName.includes("Size")) {
        return `PrismSizing.${referenceName}.value`
    } else if (theme.name == "Default") {
        return `self.${referenceName}`
    } else {
        return referenceName
    }
}

const gradientTokenDefinition = (token, theme) => {
    const fromPosition = `UnitPoint(x: ${token.value.from.x}, y: ${token.value.from.y})`
    const toPosition = `UnitPoint(x: ${token.value.to.x}, y: ${token.value.to.y})`
    const colorStops = token.value.stops
        .map((stop, index) => {
            return `Gradient.Stop(color: Color(${colorTokenDefinition(stop.color, token.darkValue ? token.darkValue.stops[index].color : undefined, theme)}), location: ${stop.position})`
        })
        .join(",\n\t")
    return `LinearGradient(
    stops: [${colorStops}],
    startPoint: ${fromPosition},
    endPoint: ${toPosition}
  )`
}

const colorTokenDefinition = (value, darkValue, theme) => {
    let darkValueResolved = darkValue
    if (!darkValue) {
        darkValueResolved = value
    }

    if (value.referencedToken) {
        if (value.referencedToken == darkValueResolved.referencedToken) {
            return referencedValueForTokenValue(value, theme)
        }

        return `UIColor(
    light: {
      self.${referencedValueForTokenValue(value, theme)}
    }(), dark: {
      self.${referencedValueForTokenValue(darkValueResolved, theme)}
    }())`
    }

    if (!darkValue) {
        return `
      UIColor(red: ${normalizeRGBAValue(value.r, 3)}, 
              green: ${normalizeRGBAValue(value.g, 3)}, 
              blue: ${normalizeRGBAValue(value.b, 3)}, 
              alpha: ${normalizeRGBAValue(value.a, 2)})`
    }

    return `UIColor(
    light: { 
      UIColor(red: ${normalizeRGBAValue(value.r, 3)}, 
              green: ${normalizeRGBAValue(value.g, 3)}, 
              blue: ${normalizeRGBAValue(value.b, 3)}, 
              alpha: ${normalizeRGBAValue(value.a, 2)}) 
    }(), dark: {
      UIColor(red: ${normalizeRGBAValue(darkValueResolved.r, 3)}, 
              green: ${normalizeRGBAValue(darkValueResolved.g, 3)}, 
              blue: ${normalizeRGBAValue(darkValueResolved.b, 3)}, 
              alpha: ${normalizeRGBAValue(darkValueResolved.a, 2)})
    }())`
}

const shadowTokenDefinition = (token, theme) => {
    return `PrismShadow(
    color: ${colorTokenDefinition(token.value.color, token.darkValue ? token.darkValue.color : undefined, theme)}, 
    x: ${token.value.x.measure}, 
    y: ${token.value.y.measure}, 
    radius: ${token.value.radius.measure}
  )`
}

const typographyTokenDefinition = (token, theme) => {
    if (token.value.referencedToken) {
        return referencedValueForTokenValue(token.value, theme)
    }

    return `PrismTypography(fontFamily: "${token.value.font.family}",
                          weight: "${token.value.font.subfamily}",
                          size: ${token.value.fontSize.measure},
                          lineHeight: ${token.value.lineHeight ? token.value.lineHeight.measure : "nil"},
                          letterSpacing: ${token.value.letterSpacing ? token.value.letterSpacing.measure : "nil"})`
}

Pulsar.registerFunction("uniqueFontCombinations", function(tokens) {
    const familyAndWeights = tokens.map((token) => {
        return `${token.value.font.family.replace(" ", "")}-${token.value.font.subfamily}`
    })
    const uniqueFontsCombinations = [...new Set(familyAndWeights)]

    return uniqueFontsCombinations.map((entry) => {
        const fontComponents = entry.split("-")
        return {
            family: fontComponents[0],
            weight: fontComponents[1],
            enumCase: fontComponents[1].replace(" ", "").toLowerCase(),
        }
    })
})

const variableNameForToken = (token) => {
    const tokenPath = getTokenPath(token)
    return tokenPath
        .map((pathEntry, index) => {
            if (index > 0) {
                let entry = pathEntry
                if (entry.indexOf("-") > -1) {
                    entry = entry
                        .split("-")
                        .map((_entry, index) => {
                            if (index > 0) {
                                return _entry.charAt(0).toUpperCase() + _entry.slice(1)
                            }
                            return _entry
                        })
                        .join("")
                }
                return entry.charAt(0).toUpperCase() + entry.slice(1)
            }
            return pathEntry
        })
        .join("")
}

const backendStringForToken = (token) => {
    const tokenPath = getTokenPath(token)
    return tokenPath
        .map((pathEntry, index) => {
            if (index > 0) {
                let entry = pathEntry
                if (entry.indexOf("-") > -1) {
                    entry = entry
                        .split("-")
                        .map((_entry, index) => {
                            if (index > 0) {
                                return _entry.toUpperCase()
                            }
                            return _entry.toUpperCase()
                        })
                        .join("_")
                }
                return entry.toUpperCase()
            }
            return pathEntry.toUpperCase()
        })
        .join("_")
}

Pulsar.registerFunction("backendStringForToken", backendStringForToken);
Pulsar.registerFunction("variableNameForToken", variableNameForToken);

Pulsar.registerFunction("supportedTokenTypes", function() {
    const supportedTokenTypes = Object.keys(SupernovaTokenMap).map((tokenType) => {
        return {
            tokenType,
            supernovaType: SupernovaTokenMap[tokenType],
        }
    })
    return supportedTokenTypes
})

function normalizeRGBAValue(value, decimals) {
    return (value / 255).toFixed(decimals)
}

Pulsar.registerFunction("normalizeRGBAValue", normalizeRGBAValue)

Pulsar.registerFunction("lightThemes", function(themes, noDefault) {
    const lightThemes = themes.filter((theme) => !theme.name.toLowerCase().includes("dark")).map(
        (theme) => { 
            return {
                ...theme,
                name: theme.name.replace(/\s/g, "")
            }
        }
    )
    const defaultTheme = {
        name: "Default",
    }
    if (noDefault) {
        return [...lightThemes]
    }
    return [defaultTheme, ...lightThemes]
})

Pulsar.registerFunction("defaultTheme", function() {
    return {
        name: "Default",
    }
})

Pulsar.registerFunction("filePathForThemeActivator", function(theme) {
    return `Sources/PrismTokens${theme.name == "Default" ? "" : theme.name}/PrismTokens${theme.name}Activator.swift`
})

Pulsar.registerFunction("filePathForThemeProvider", function(theme, type) {
    let themeName = theme.name ? theme.name : "Default"
    return `Sources/PrismTokens${themeName == "Default" ? "" : themeName}/${themeProviderName(themeName)}.swift`
})

Pulsar.registerFunction("filePathForFonts", function(theme) {
    let themeName = theme.name ? theme.name : "Default"
    return `Sources/PrismTokens${themeName == "Default" ? "" : themeName}/Prism${themeName}Fonts.swift`
})

Pulsar.registerFunction("filePathForTokenProvider", function(theme, type, isExtension) {
    let themeName = theme.name ? theme.name : "Default"
    if (themeName == "Default" && isExtension) {
        return `Sources/PrismTokens/Core/Providers/Extensions/${tokenProviderNameForType(type)}+Extensions.swift`
    }
    return `Sources/PrismTokens${themeName == "Default" ? "" : themeName}/${tokenProviderNameForType(type, themeName)}.swift`
})

Pulsar.registerFunction("providerClassDefinitionForTokenType", function(type, theme, isExtension) {
    let themeName = theme.name ? theme.name : "Default"
    if (themeName == "Default" && isExtension) {
        let typeName = friendlyNameForType(type, true)
        let comment = `/// Extension providing the Default theme values for ${typeName} tokens.`
        let declaraction = `public extension ${tokenProviderNameForType(type)}`
        return comment + "\n" + declaraction
    }
    return `class ${tokenProviderNameForType(type, themeName)}: ${tokenProviderNameForType(type)}`
})

Pulsar.registerFunction("packageImports", function(theme) {
    let themeName = theme.name ? theme.name : "Default"
    if (themeName == "Default") {
        return ``
    } else {
        return `import PrismTokens
    `
    }
})

Pulsar.registerFunction("mergeDarkValues", function(defaultTokens, themes, includeInheritedTokens) {
    const darkThemes = themes.filter((theme) => theme.name.toLowerCase().includes("dark"))

    const lightThemes = themes.filter((theme) => !theme.name.toLowerCase().includes("dark"))

    const defaultTheme = defaultTokens.map((token) => {
        const tokenName = variableNameForToken(token)
        const defaultDark = darkThemes.find((theme) => theme.name === "DefaultDark")

        const darkToken = defaultDark.overriddenTokens.find((darkToken) => {
            return variableNameForToken(darkToken) === tokenName
        })

        if (!darkToken) {
            return token
        }

        const darkValue = darkToken.value

        if (token.value.hex && darkValue.hex === token.value.hex) {
            return token
        }

        return {
            ...token,
            darkValue,
        }
    })

    const mergedThemes = lightThemes.map((theme) => {
        const tokens = includeInheritedTokens ? defaultTokens : theme.overriddenTokens

        const themeTokens = tokens.map((token) => {
            const tokenName = variableNameForToken(token)

            let resultToken = token

            if (includeInheritedTokens) {
                const themeOverride = theme.overriddenTokens.find((_token) => variableNameForToken(_token) === tokenName)

                if (themeOverride) {
                    resultToken = themeOverride
                }
            }

            const darkTheme = darkThemes.find((_theme) => _theme.name.includes(theme.name))

            if (!darkTheme) {
                return resultToken
            }

            const darkToken = darkTheme.overriddenTokens.find((_token) => variableNameForToken(_token) === tokenName)

            if (!darkToken) {
                return resultToken
            }

            if (resultToken.value.hex === darkToken.value.hex) {
                return resultToken
            }

            return {
                ...resultToken,
                darkValue: darkToken.value,
            }
        })

        return {
            ...theme,
            overriddenTokens: themeTokens,
        }
    })

    const allThemes = [defaultTheme, ...mergedThemes]

    return allThemes
})