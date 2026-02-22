using UnityEngine;
using UnityEngine.Networking;
using System.Collections;
using System.IO;
using System.Diagnostics;
using Debug = UnityEngine.Debug;

namespace SkyBattle.Core
{
    public class ServerProcessManager : MonoBehaviour
    {
        public static ServerProcessManager Instance { get; private set; }

        [Header("Settings")]
        public string ServerBinaryName = "skybattle-server";
        public bool StartOnAwake = false;

        private Process serverProcess;
        private string internalPath;

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
                DontDestroyOnLoad(gameObject);
            }
            else
            {
                Destroy(gameObject);
            }

            internalPath = Path.Combine(Application.persistentDataPath, ServerBinaryName);

            if (StartOnAwake)
            {
                StartCoroutine(EnsureServerReadyAndStart());
            }
        }

        public IEnumerator EnsureServerReadyAndStart()
        {
            yield return StartCoroutine(ExtractBinary());
            StartServer();
        }

        private IEnumerator ExtractBinary()
        {
            string sourcePath = Path.Combine(Application.streamingAssetsPath, ServerBinaryName);
            
            // For Android, streamingAssets are in the JAR/APK
            if (sourcePath.Contains("://") || sourcePath.Contains(":///"))
            {
                using (UnityWebRequest www = UnityWebRequest.Get(sourcePath))
                {
                    yield return www.SendWebRequest();

                    if (www.result == UnityWebRequest.Result.Success)
                    {
                        File.WriteAllBytes(internalPath, www.downloadHandler.data);
                        Debug.Log($"Server binary extracted to: {internalPath}");
                    }
                    else
                    {
                        Debug.LogError($"Failed to extract server binary: {www.error}");
                    }
                }
            }
            else
            {
                // For PC/Editor
                if (File.Exists(sourcePath))
                {
                    File.Copy(sourcePath, internalPath, true);
                    Debug.Log($"Server binary copied to: {internalPath}");
                }
            }

            // Set executable permissions on Unix/Android
#if !UNITY_EDITOR_WIN && !UNITY_STANDALONE_WIN
            try {
                Process.Start("chmod", "+x " + internalPath);
            } catch (System.Exception e) {
                Debug.LogWarning("Failed to set executable permissions: " + e.Message);
            }
#endif
        }

        public void StartServer()
        {
            if (serverProcess != null && !serverProcess.HasExited)
            {
                Debug.LogWarning("Server is already running.");
                return;
            }

            try
            {
                serverProcess = new Process();
                serverProcess.StartInfo.FileName = internalPath;
                serverProcess.StartInfo.WorkingDirectory = Application.persistentDataPath;
                serverProcess.StartInfo.UseShellExecute = false;
                serverProcess.StartInfo.CreateNoWindow = true;
                
                // Redirect logs if possible
                // serverProcess.StartInfo.RedirectStandardOutput = true;
                
                serverProcess.Start();
                Debug.Log("Server process started successfully.");
            }
            catch (System.`Exception` e)
            {
                Debug.LogError($"Failed to start server process: {e.Message}");
            }
        }

        public void StopServer()
        {
            if (serverProcess != null && !serverProcess.HasExited)
            {
                serverProcess.Kill();
                serverProcess.Dispose();
                serverProcess = null;
                Debug.Log("Server process stopped.");
            }
        }

        private void OnApplicationQuit()
        {
            StopServer();
        }
    }
}
