package com.tongpinghui.conference.ui.profile

import android.content.Context
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.tongpinghui.conference.BuildConfig
import com.tongpinghui.conference.core.ServiceLocator
import com.tongpinghui.conference.trtc.TrtcConfig
import com.tongpinghui.conference.ui.component.AppTopBar
import com.tongpinghui.conference.ui.component.Avatar
import com.tongpinghui.conference.ui.component.ConfirmDialog
import com.tongpinghui.conference.ui.component.ErrorBar
import com.tongpinghui.conference.ui.component.LoadingBox
import com.tongpinghui.conference.ui.component.PrimaryButton
import com.tongpinghui.conference.ui.component.SecondaryButton
import com.tongpinghui.conference.ui.component.SectionCard
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class ProfileUiState(
    val loading: Boolean = true,
    val saving: Boolean = false,
    val uploading: Boolean = false,
    val account: String = "",
    val nickname: String = "",
    val department: String = "",
    val avatarUrl: String = "",
    val message: String? = null,
    val error: String? = null,
    val trtcUserId: String = ""
)

class ProfileViewModel : ViewModel() {

    private val _state = MutableStateFlow(ProfileUiState())
    val state: StateFlow<ProfileUiState> = _state.asStateFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            ServiceLocator.tokenStore.current()?.let { s ->
                _state.update {
                    it.copy(
                        account = s.account,
                        nickname = s.nickname,
                        department = s.department,
                        avatarUrl = s.avatarUrl,
                        trtcUserId = TrtcConfig.toTrtcUserId(s.account)
                    )
                }
            }
            ServiceLocator.userRepository.me()
                .onSuccess { user ->
                    _state.update {
                        it.copy(
                            loading = false,
                            account = user.account,
                            nickname = user.nickname,
                            department = user.department,
                            avatarUrl = user.avatarUrl,
                            trtcUserId = TrtcConfig.toTrtcUserId(user.account),
                            error = null
                        )
                    }
                }
                .onFailure { e ->
                    _state.update { it.copy(loading = false, error = "资料同步失败：${e.message}") }
                }
        }
    }

    fun onNicknameChange(value: String) =
        _state.update { it.copy(nickname = value, message = null, error = null) }

    fun onDepartmentChange(value: String) =
        _state.update { it.copy(department = value, message = null, error = null) }

    fun dismissMessage() = _state.update { it.copy(message = null, error = null) }

    fun save() {
        val current = _state.value
        if (current.nickname.isBlank()) {
            _state.update { it.copy(error = "昵称不能为空") }
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(saving = true, error = null, message = null) }
            ServiceLocator.userRepository
                .updateProfile(current.nickname, current.avatarUrl, current.department)
                .onSuccess { user ->
                    ServiceLocator.tokenStore.updateProfile(user.nickname, user.avatarUrl, user.department)
                    _state.update {
                        it.copy(
                            saving = false,
                            nickname = user.nickname,
                            department = user.department,
                            avatarUrl = user.avatarUrl,
                            message = "已保存"
                        )
                    }
                }
                .onFailure { e ->
                    _state.update { it.copy(saving = false, error = "保存失败：${e.message}") }
                }
        }
    }

    /** 相册选图后上传（读 Uri 需要 ContentResolver，所以传 applicationContext 进来） */
    fun uploadAvatar(context: Context, uri: Uri) {
        viewModelScope.launch {
            _state.update { it.copy(uploading = true, error = null, message = null) }
            val payload = runCatching {
                val resolver = context.contentResolver
                val mime = resolver.getType(uri) ?: "image/jpeg"
                val bytes = resolver.openInputStream(uri)?.use { it.readBytes() }
                    ?: throw IllegalStateException("读取图片失败")
                if (bytes.size > 5 * 1024 * 1024) throw IllegalStateException("图片不能超过 5MB")
                val ext = when {
                    mime.contains("png") -> "png"
                    mime.contains("webp") -> "webp"
                    else -> "jpg"
                }
                AvatarUpload(bytes, "avatar_${System.currentTimeMillis()}.$ext", mime)
            }.getOrElse { e ->
                _state.update { it.copy(uploading = false, error = "读取图片失败：${e.message}") }
                return@launch
            }

            ServiceLocator.userRepository
                .uploadAvatar(payload.bytes, payload.fileName, payload.mimeType)
                .onSuccess { user ->
                    ServiceLocator.tokenStore.updateProfile(user.nickname, user.avatarUrl, user.department)
                    _state.update {
                        it.copy(uploading = false, avatarUrl = user.avatarUrl, message = "头像已更新")
                    }
                }
                .onFailure { e ->
                    _state.update { it.copy(uploading = false, error = "头像上传失败：${e.message}") }
                }
        }
    }

    fun removeAvatar() {
        val current = _state.value
        viewModelScope.launch {
            _state.update { it.copy(uploading = true, error = null, message = null) }
            ServiceLocator.userRepository
                .updateProfile(current.nickname, "", current.department)
                .onSuccess { user ->
                    ServiceLocator.tokenStore.updateProfile(user.nickname, "", user.department)
                    _state.update { it.copy(uploading = false, avatarUrl = "", message = "已恢复默认头像") }
                }
                .onFailure { e ->
                    _state.update { it.copy(uploading = false, error = "操作失败：${e.message}") }
                }
        }
    }

    fun changePassword(old: String, new: String, onDone: (Boolean, String) -> Unit) {
        viewModelScope.launch {
            ServiceLocator.userRepository.changePassword(old, new)
                .onSuccess { onDone(true, "密码已修改") }
                .onFailure { e -> onDone(false, e.message ?: "修改失败") }
        }
    }

    fun logout(onDone: () -> Unit) {
        viewModelScope.launch {
            ServiceLocator.authRepository.logout()
            onDone()
        }
    }
}

private class AvatarUpload(val bytes: ByteArray, val fileName: String, val mimeType: String)

/** 有状态外壳：ViewModel + 相册选择器 + 三个弹窗都挂在这里 */
@Composable
fun ProfileRoute(
    onBack: () -> Unit,
    onLoggedOut: () -> Unit,
    viewModel: ProfileViewModel = viewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val context = LocalContext.current

    var showPasswordDialog by remember { mutableStateOf(false) }
    var showLogoutDialog by remember { mutableStateOf(false) }
    var showAvatarSheet by remember { mutableStateOf(false) }

    val pickImage = rememberLauncherForActivityResult(
        ActivityResultContracts.PickVisualMedia()
    ) { uri ->
        if (uri != null) viewModel.uploadAvatar(context.applicationContext, uri)
    }

    ProfileScreen(
        state = state,
        onBack = onBack,
        onNicknameChange = viewModel::onNicknameChange,
        onDepartmentChange = viewModel::onDepartmentChange,
        onSave = viewModel::save,
        onChangeAvatar = { showAvatarSheet = true },
        onChangePassword = { showPasswordDialog = true },
        onLogout = { showLogoutDialog = true },
        onDismissMessage = viewModel::dismissMessage
    )

    if (showAvatarSheet) {
        AlertDialog(
            onDismissRequest = { showAvatarSheet = false },
            title = { Text("头像") },
            text = { Text("从相册选择一张图片作为头像，建议使用正方形图片。") },
            confirmButton = {
                TextButton(onClick = {
                    showAvatarSheet = false
                    pickImage.launch(
                        PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                    )
                }) { Text("从相册选择") }
            },
            dismissButton = {
                TextButton(onClick = {
                    showAvatarSheet = false
                    viewModel.removeAvatar()
                }) { Text("移除头像") }
            }
        )
    }

    if (showPasswordDialog) {
        ChangePasswordDialog(
            onDismiss = { showPasswordDialog = false },
            onSubmit = { old, new, done -> viewModel.changePassword(old, new, done) }
        )
    }

    if (showLogoutDialog) {
        ConfirmDialog(
            title = "退出登录",
            message = "退出后需要重新输入账号密码，会议中会立即断开。",
            confirmText = "退出",
            danger = true,
            onConfirm = {
                showLogoutDialog = false
                viewModel.logout(onLoggedOut)
            },
            onDismiss = { showLogoutDialog = false }
        )
    }
}

/** 纯界面：只认状态和回调，可直接 @Preview */
@Composable
fun ProfileScreen(
    state: ProfileUiState,
    onBack: () -> Unit = {},
    onNicknameChange: (String) -> Unit = {},
    onDepartmentChange: (String) -> Unit = {},
    onSave: () -> Unit = {},
    onChangeAvatar: () -> Unit = {},
    onChangePassword: () -> Unit = {},
    onLogout: () -> Unit = {},
    onDismissMessage: () -> Unit = {}
) {
    Column(Modifier.fillMaxSize()) {

        AppTopBar(title = "个人信息", onBack = onBack)

        if (state.loading) {
            LoadingBox()
            return@Column
        }

        if (state.error != null) {
            ErrorBar(message = state.error.orEmpty(), onRetry = onDismissMessage)
        }
        if (state.message != null) {
            Text(
                text = state.message.orEmpty(),
                color = MaterialTheme.colorScheme.primary,
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
            )
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                // 底部避开手势条/导航栏（退出登录按钮别贴到系统区域里）
                .navigationBarsPadding()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // 头像
            SectionCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(72.dp)
                            .clip(RoundedCornerShape(24.dp))
                            .clickable(onClick = onChangeAvatar),
                        contentAlignment = Alignment.BottomEnd
                    ) {
                        Avatar(
                            name = state.nickname.ifEmpty { state.account },
                            avatarUrl = state.avatarUrl,
                            size = 72.dp
                        )
                        Icon(
                            Icons.Filled.CameraAlt,
                            contentDescription = "更换头像",
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                    Spacer(Modifier.width(16.dp))
                    Column(Modifier.weight(1f)) {
                        Text(
                            text = state.nickname.ifEmpty { "未设置昵称" },
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                        Spacer(Modifier.height(2.dp))
                        Text(
                            text = "账号 ${state.account}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(Modifier.height(6.dp))
                        SecondaryButton(
                            text = if (state.uploading) "上传中…" else "更换头像",
                            enabled = !state.uploading,
                            onClick = onChangeAvatar
                        )
                    }
                }
            }

            // 基本资料
            SectionCard(title = "基本资料") {
                OutlinedTextField(
                    value = state.nickname,
                    onValueChange = onNicknameChange,
                    label = { Text("昵称（会议中显示）") },
                    singleLine = true,
                    leadingIcon = { Icon(Icons.Filled.Person, contentDescription = null) },
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.height(12.dp))
                OutlinedTextField(
                    value = state.department,
                    onValueChange = onDepartmentChange,
                    label = { Text("部门") },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.height(16.dp))
                PrimaryButton(text = "保存资料", loading = state.saving, onClick = onSave)
            }

            // 账号安全
            SectionCard(title = "账号安全") {
                // TRTC userId 只是公开标识（u_<账号>），不是密钥 —— 真正的密钥
                // （SDKSecretKey）只存在于服务端，客户端拿到的 UserSig 是短时效票据。
                // 但它属于实现细节，普通用户看不懂，所以只在 debug 包里显示，方便排查。
                if (BuildConfig.DEBUG) {
                    Text(
                        text = "调试信息：腾讯云 TRTC userId = ${state.trtcUserId}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        text = "进会议时用它登录腾讯云，并展示上面的昵称与头像。",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(Modifier.height(14.dp))
                }
                OutlinedButton(
                    onClick = onChangePassword,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Filled.Lock, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("修改密码")
                }
            }

            OutlinedButton(
                onClick = onLogout,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(
                    Icons.Filled.Logout,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp),
                    tint = MaterialTheme.colorScheme.error
                )
                Spacer(Modifier.width(8.dp))
                Text("退出登录", color = MaterialTheme.colorScheme.error)
            }

            Spacer(Modifier.height(20.dp))
        }
    }
}

@Composable
private fun ChangePasswordDialog(
    onDismiss: () -> Unit,
    onSubmit: (old: String, new: String, done: (Boolean, String) -> Unit) -> Unit
) {
    var old by remember { mutableStateOf("") }
    var new by remember { mutableStateOf("") }
    var confirm by remember { mutableStateOf("") }
    var hint by remember { mutableStateOf<String?>(null) }
    var submitting by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("修改密码") },
        text = {
            Column {
                OutlinedTextField(
                    value = old,
                    onValueChange = { old = it },
                    label = { Text("当前密码") },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(
                    value = new,
                    onValueChange = { new = it },
                    label = { Text("新密码（至少 6 位）") },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(
                    value = confirm,
                    onValueChange = { confirm = it },
                    label = { Text("确认新密码") },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    modifier = Modifier.fillMaxWidth()
                )
                if (hint != null) {
                    Spacer(Modifier.height(8.dp))
                    Text(
                        text = hint.orEmpty(),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error
                    )
                }
            }
        },
        confirmButton = {
            TextButton(
                enabled = !submitting,
                onClick = {
                    when {
                        old.isBlank() -> hint = "请输入当前密码"
                        new.length < 6 -> hint = "新密码至少 6 位"
                        new != confirm -> hint = "两次输入的新密码不一致"
                        else -> {
                            submitting = true
                            onSubmit(old, new) { ok, msg ->
                                submitting = false
                                if (ok) onDismiss() else hint = msg
                            }
                        }
                    }
                }
            ) { Text("确定") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("取消") } }
    )
}
