using UnityEngine;

namespace SkyBattle.UI
{
    public abstract class UIScreen : MonoBehaviour
    {
        public string ScreenName;

        public virtual void OnOpen()
        {
            gameObject.SetActive(true);
        }

        public virtual void OnClose()
        {
            gameObject.SetActive(false);
        }
    }
}
