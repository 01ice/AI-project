package com.tongpinghui.conference.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.tongpinghui.conference.core.ServiceLocator
import com.tongpinghui.conference.ui.component.LoadingBox
import com.tongpinghui.conference.ui.login.LoginRoute
import com.tongpinghui.conference.ui.meeting.MeetingListRoute
import com.tongpinghui.conference.ui.profile.ProfileRoute

object Routes {
    const val LOGIN = "login"
    const val HOME = "home"
    const val PROFILE = "profile"
}

@Composable
fun AppNavHost() {

    val navController = rememberNavController()
    var startDestination by remember { mutableStateOf<String?>(null) }

    // 启动时读本地会话决定去登录页还是会议列表
    LaunchedEffect(Unit) {
        val session = ServiceLocator.tokenStore.current()
        startDestination = if (session == null) Routes.LOGIN else Routes.HOME
    }

    val destination = startDestination
    if (destination == null) {
        Box(Modifier.fillMaxSize()) { LoadingBox() }
        return
    }

    NavHost(navController = navController, startDestination = destination) {

        composable(Routes.LOGIN) {
            LoginRoute(
                onLoggedIn = {
                    navController.navigate(Routes.HOME) {
                        popUpTo(Routes.LOGIN) { inclusive = true }
                    }
                }
            )
        }

        composable(Routes.HOME) {
            MeetingListRoute(
                onOpenProfile = { navController.navigate(Routes.PROFILE) }
            )
        }

        composable(Routes.PROFILE) {
            ProfileRoute(
                onBack = { navController.popBackStack() },
                onLoggedOut = {
                    navController.navigate(Routes.LOGIN) {
                        // 退出登录：清掉整个回退栈，避免返回时又回到会议列表
                        popUpTo(navController.graph.id) { inclusive = true }
                    }
                }
            )
        }
    }
}
