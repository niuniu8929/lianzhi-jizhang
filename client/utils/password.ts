import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const PASSWORD_KEY = '@lianzhi_jizhang_password_hash';

/**
 * 密码存储工具
 * 使用 SHA-256 哈希存储密码，不存储明文
 */
export const PasswordStorage = {
  /**
   * 检查是否已设置密码
   */
  async hasPassword(): Promise<boolean> {
    try {
      const hash = await AsyncStorage.getItem(PASSWORD_KEY);
      return hash !== null && hash.length > 0;
    } catch (error) {
      console.error('检查密码失败:', error);
      return false;
    }
  },

  /**
   * 设置密码（存储哈希值）
   */
  async setPassword(password: string): Promise<boolean> {
    try {
      if (!password || password.length < 4) {
        return false;
      }
      const hash = await this.hashPassword(password);
      await AsyncStorage.setItem(PASSWORD_KEY, hash);
      return true;
    } catch (error) {
      console.error('设置密码失败:', error);
      return false;
    }
  },

  /**
   * 验证密码
   */
  async verifyPassword(password: string): Promise<boolean> {
    try {
      const storedHash = await AsyncStorage.getItem(PASSWORD_KEY);
      if (!storedHash) {
        return false;
      }
      const inputHash = await this.hashPassword(password);
      return storedHash === inputHash;
    } catch (error) {
      console.error('验证密码失败:', error);
      return false;
    }
  },

  /**
   * 修改密码（需要验证旧密码）
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      // 验证旧密码
      const isValid = await this.verifyPassword(oldPassword);
      if (!isValid) {
        return { success: false, message: '原密码错误' };
      }

      // 设置新密码
      const success = await this.setPassword(newPassword);
      if (success) {
        return { success: true, message: '密码修改成功' };
      } else {
        return { success: false, message: '新密码格式无效' };
      }
    } catch (error) {
      console.error('修改密码失败:', error);
      return { success: false, message: '修改密码失败' };
    }
  },

  /**
   * 清除密码（用于重置）
   */
  async clearPassword(): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(PASSWORD_KEY);
      return true;
    } catch (error) {
      console.error('清除密码失败:', error);
      return false;
    }
  },

  /**
   * 使用 SHA-256 哈希密码
   */
  async hashPassword(password: string): Promise<string> {
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      password
    );
    return hash;
  },
};
