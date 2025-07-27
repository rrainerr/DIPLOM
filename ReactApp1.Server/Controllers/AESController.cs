using Microsoft.AspNetCore.Mvc;
using System.Globalization;
using System.Security.Cryptography;

namespace ReactApp1.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class aesController : ControllerBase
    {
        private readonly IConfiguration _configuration;

        public aesController(IConfiguration configuration)
        {
         
            _configuration = configuration;

            var base64Key = _configuration["Encryption:Base64Key"];
            SimpleAES.Initialize(base64Key);
        }

        public static class SimpleAES
        {
            private static byte[] _key;
            private static readonly byte[] IV = new byte[16];

            public static void Initialize(string base64Key)
            {
                _key = Convert.FromBase64String(base64Key);
            }

            public static string Encrypt(double? coordinate)
            {
                return coordinate.HasValue
                    ? Encrypt(coordinate.Value.ToString(CultureInfo.InvariantCulture))
                    : null;
            }

            public static string Encrypt(string plainText)
            {
                if (string.IsNullOrEmpty(plainText)) return null;

                using (Aes aes = Aes.Create())
                {
                    aes.Key = _key;
                    aes.IV = IV;

                    using var encryptor = aes.CreateEncryptor();
                    using var ms = new MemoryStream();
                    using var cs = new CryptoStream(ms, encryptor, CryptoStreamMode.Write);
                    using var sw = new StreamWriter(cs);
                    sw.Write(plainText);
                    sw.Close();

                    return Convert.ToBase64String(ms.ToArray());
                }
            }

            public static double? DecryptToDouble(string cipherText)
            {
                if (string.IsNullOrEmpty(cipherText)) return null;

                try
                {
                    string decrypted = Decrypt(cipherText);
                    return double.TryParse(decrypted, NumberStyles.Any, CultureInfo.InvariantCulture, out double result)
                        ? result
                        : null;
                }
                catch
                {
                    return null;
                }
            }

            public static string Decrypt(string cipherText)
            {
                if (string.IsNullOrEmpty(cipherText)) return null;

                using (Aes aes = Aes.Create())
                {
                    aes.Key = _key;
                    aes.IV = IV;

                    using var decryptor = aes.CreateDecryptor();
                    using var ms = new MemoryStream(Convert.FromBase64String(cipherText));
                    using var cs = new CryptoStream(ms, decryptor, CryptoStreamMode.Read);
                    using var sr = new StreamReader(cs);

                    return sr.ReadToEnd();
                }
            }
        }

    }
}
