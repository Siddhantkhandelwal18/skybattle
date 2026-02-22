using UnityEngine;
using System.Collections.Generic;
using System.Linq;

namespace SkyBattle.UI
{
    public class UIManager : MonoBehaviour
    {
        public static UIManager Instance { get; private set; }

        [SerializeField] private List<UIScreen> screens;
        [SerializeField] private string initialScreen = "MainMenu";

        private UIScreen currentScreen;

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
        }

        private void Start()
        {
            HideAllScreens();
            ShowScreen(initialScreen);
        }

        public void ShowScreen(string screenName)
        {
            UIScreen nextScreen = screens.FirstOrDefault(s => s.ScreenName == screenName);
            if (nextScreen == null)
            {
                Debug.LogWarning($"Screen {screenName} not found!");
                return;
            }

            if (currentScreen != null)
            {
                currentScreen.OnClose();
            }

            currentScreen = nextScreen;
            currentScreen.OnOpen();
        }

        public void HideAllScreens()
        {
            foreach (var screen in screens)
            {
                screen.OnClose();
            }
        }
    }
}
