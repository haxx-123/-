
import { supabaseStorage } from '../supabase';

const DIRECT_URL_ROOT = "https://jlaktbxhkftokfdyqdrmt.supabase.co";

export const getDirectImageUrl = (pathOrUrl: string | null | undefined) => {
  if (!pathOrUrl) return undefined;

  // 如果已经是官方直连链接，直接返回
  if (pathOrUrl.startsWith(DIRECT_URL_ROOT)) return pathOrUrl;

  // 如果是代理链接，强制替换为官方直连域名
  if (pathOrUrl.includes('stockwise.art')) {
    return pathOrUrl.replace('https://stockwise.art/api', DIRECT_URL_ROOT);
  }

  // 如果只是相对路径/文件名 (例如 "prod_123.jpg")，生成官方公共链接
  // 使用 supabaseStorage 实例确保生成的是官方域名的链接
  if (!pathOrUrl.startsWith('http')) {
      const { data } = supabaseStorage.storage.from('images').getPublicUrl(pathOrUrl);
      return data.publicUrl;
  }

  return pathOrUrl;
};
