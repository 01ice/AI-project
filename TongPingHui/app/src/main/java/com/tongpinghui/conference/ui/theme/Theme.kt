package com.tongpinghui.conference.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val BrandBlue = Color(0xFF1E6FFF)
val BrandBlueDeep = Color(0xFF0B47B3)
private val BrandSurface = Color(0xFFF5F7FB)

private val LightColors = lightColorScheme(
    primary = BrandBlue,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFD9E6FF),
    onPrimaryContainer = BrandBlueDeep,
    secondary = Color(0xFF3C6E9F),
    onSecondary = Color.White,
    background = BrandSurface,
    onBackground = Color(0xFF11151C),
    surface = Color.White,
    onSurface = Color(0xFF11151C),
    surfaceVariant = Color(0xFFE8ECF4),
    onSurfaceVariant = Color(0xFF454B54),
    outline = Color(0xFFB8BFCB),
    error = Color(0xFFD93025)
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFF9CBBFF),
    onPrimary = Color(0xFF002E69),
    primaryContainer = Color(0xFF1B3A6B),
    onPrimaryContainer = Color(0xFFD9E6FF),
    secondary = Color(0xFFA6C8E8),
    onSecondary = Color(0xFF0B2233),
    background = Color(0xFF11151C),
    onBackground = Color(0xFFE7EAF0),
    surface = Color(0xFF181D26),
    onSurface = Color(0xFFE7EAF0),
    surfaceVariant = Color(0xFF2A3140),
    onSurfaceVariant = Color(0xFFC2C9D6),
    outline = Color(0xFF6A7383),
    error = Color(0xFFFF8A80)
)

@Composable
fun TongPingHuiTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        typography = Typography(),
        content = content
    )
}
