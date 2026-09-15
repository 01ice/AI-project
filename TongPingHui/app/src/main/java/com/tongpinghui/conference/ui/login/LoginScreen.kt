package com.tongpinghui.conference.ui.login

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Badge
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Login
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.tongpinghui.conference.BuildConfig
import com.tongpinghui.conference.core.ServiceLocator
import com.tongpinghui.conference.trtc.TrtcConfig
import com.tongpinghui.conference.ui.component.PrimaryButton
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class LoginUiState(
    val account: String = "",
    val password: String = "",
    val passwordVisible: Boolean = false,
    val loading: Boolean = false,
    val error: String? = null
) {
    val canSubmit: Boolean get() = account.isNotBlank() && password.length >= 6 && !loading
}

class LoginViewModel : ViewModel() {

    private val _state = MutableStateFlow(LoginUiState())
    val state: StateFlow<LoginUiState> = _state.asStateFlow()

    fun onAccountChange(value: String) =
        _state.update { it.copy(account = value.trim(), error = null) }

    fun onPasswordChange(value: String) =
        _state.update { it.copy(password = value, error = null) }

    fun togglePasswordVisible() =
        _state.update { it.copy(passwordVisible = !it.passwordVisible) }

    fun login(onSuccess: () -> Unit) {
        val current = _state.value
        if (current.account.isBlank()) {
            _state.update { it.copy(error = "请输入工号或手机号") }
            return
        }
        if (current.password.length < 6) {
            _state.update { it.copy(error = "密码至少 6 位") }
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(loading = true, error = null) }
            ServiceLocator.authRepository.login(current.account, current.password)
                .onSuccess {
                    _state.update { it.copy(loading = false, password = "") }
                    onSuccess()
                }
                .onFailure { e ->
                    _state.update { it.copy(loading = false, error = e.message ?: "登录失败") }
                }
        }
    }
}

/** 登录页的「有状态外壳」：负责拿 ViewModel、承受副作用 */
@Composable
fun LoginRoute(
    onLoggedIn: () -> Unit,
    viewModel: LoginViewModel = viewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    LoginScreen(
        state = state,
        onAccountChange = viewModel::onAccountChange,
        onPasswordChange = viewModel::onPasswordChange,
        onTogglePasswordVisible = viewModel::togglePasswordVisible,
        onSubmit = { viewModel.login(onLoggedIn) }
    )
}

/**
 * 登录页的「纯界面」：只认状态和回调，所以在 IDE 里可以直接 @Preview
 * （见 ui/PreviewGallery.kt）。
 */
@Composable
fun LoginScreen(
    state: LoginUiState,
    onAccountChange: (String) -> Unit = {},
    onPasswordChange: (String) -> Unit = {},
    onTogglePasswordVisible: () -> Unit = {},
    onSubmit: () -> Unit = {}
) {
    var showOpenHint by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            // 键盘弹出时把内容顶上去，否则「登录」按钮会被输入法盖住
            .imePadding()
            .padding(horizontal = 26.dp),
        verticalArrangement = Arrangement.Center
    ) {
        Spacer(Modifier.height(56.dp))

        // ---------------- 品牌区 ----------------
        Box(
            modifier = Modifier
                .size(72.dp)
                .clip(RoundedCornerShape(20.dp))
                .background(Brush.linearGradient(listOf(Color(0xFF1E6FFF), Color(0xFF4C9AFF)))),
            contentAlignment = Alignment.Center
        ) {
            Text("同", color = Color.White, fontSize = 34.sp, fontWeight = FontWeight.Bold)
        }
        Spacer(Modifier.height(18.dp))
        Text(
            text = "同屏会",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold
        )
        Spacer(Modifier.height(6.dp))
        Text(
            text = "多人视频会议 · 屏幕共享 · 仅限公司内部使用",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(Modifier.height(36.dp))

        // ---------------- 表单 ----------------
        OutlinedTextField(
            value = state.account,
            onValueChange = onAccountChange,
            label = { Text("工号 / 手机号") },
            singleLine = true,
            leadingIcon = { Icon(Icons.Filled.Badge, contentDescription = null) },
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Text,
                imeAction = ImeAction.Next
            ),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(Modifier.height(14.dp))

        OutlinedTextField(
            value = state.password,
            onValueChange = onPasswordChange,
            label = { Text("密码") },
            singleLine = true,
            leadingIcon = { Icon(Icons.Filled.Lock, contentDescription = null) },
            trailingIcon = {
                IconButton(onClick = onTogglePasswordVisible) {
                    Icon(
                        imageVector = if (state.passwordVisible) Icons.Filled.VisibilityOff
                        else Icons.Filled.Visibility,
                        contentDescription = if (state.passwordVisible) "隐藏密码" else "显示密码"
                    )
                }
            },
            visualTransformation = if (state.passwordVisible) VisualTransformation.None
            else PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Password,
                imeAction = ImeAction.Done
            ),
            keyboardActions = KeyboardActions(onDone = { onSubmit() }),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth()
        )

        if (state.error != null) {
            Spacer(Modifier.height(12.dp))
            Text(
                text = state.error.orEmpty(),
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodyMedium
            )
        }

        Spacer(Modifier.height(26.dp))

        PrimaryButton(
            text = "登 录",
            loading = state.loading,
            enabled = state.canSubmit,
            onClick = onSubmit
        )

        Spacer(Modifier.height(18.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = if (showOpenHint) "请联系 IT 管理员在后台开通账号" else "还没有账号？申请开通",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier
                    .clip(RoundedCornerShape(6.dp))
                    .clickable { showOpenHint = !showOpenHint }
                    .padding(horizontal = 6.dp, vertical = 6.dp)
            )
        }

        Spacer(Modifier.height(28.dp))

        // ---------------- 上线前自检 ----------------
        if (!TrtcConfig.canProduceUserSigLocally) {
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.errorContainer
                ),
                shape = RoundedCornerShape(14.dp)
            ) {
                Column(Modifier.padding(14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Filled.WarningAmber,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp),
                            tint = MaterialTheme.colorScheme.onErrorContainer
                        )
                        Spacer(Modifier.width(8.dp))
                        Text(
                            text = "腾讯云 UserSig 未就绪",
                            style = MaterialTheme.typography.titleSmall,
                            color = MaterialTheme.colorScheme.onErrorContainer
                        )
                    }
                    Spacer(Modifier.height(6.dp))
                    Text(
                        text = "正式方案：启动 server/ 后端，UserSig 由 /api/v1/trtc/usersig 签发；" +
                            "本地兜底：把控制台生成的 SDKSecretKey 填到 local.properties 的 " +
                            "TRTC_SDK_SECRET_KEY，或用 TRTC_TEST_USER_SIG 填一张临时票据。" +
                            "三者都没有时，登录能用、进会议会失败。",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onErrorContainer
                    )
                }
            }
            Spacer(Modifier.height(16.dp))
        }

        Text(
            text = "v${BuildConfig.VERSION_NAME}　SDKAppID ${TrtcConfig.sdkAppId}\n" +
                "服务器 ${BuildConfig.API_BASE_URL}",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(Modifier.height(24.dp))
    }
}
