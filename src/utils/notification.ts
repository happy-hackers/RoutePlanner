import { notification } from 'antd'
import sound from '../assets/sounds/sms-received1.mp3'

const notification_sound = new Audio(sound)

const createNotification = (
  type: 'success' | 'info' | 'warning' | 'error', 
  message: string, 
  duration?: number, 
  description?: string
) => {
    notification_sound.play()
    notification[type]({
      message,
      duration: duration ?? 3,
      description
    })
}
export default createNotification