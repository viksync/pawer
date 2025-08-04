import Foundation
import UserNotifications

class MacNotifications {
    static let shared = MacNotifications()
    
    init() {
        requestNotificationPermission()
    }
    
    private func requestNotificationPermission() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { granted, error in
            if let error = error {
                //TODO: create a banner in main view that tells Pawer won't send notifications. Let user enable them again
                print("Notification permission error: \(error)")
            }
        }
    }
    
    func sendBatteryAlert(batteryLevel: Int) {
        let content = UNMutableNotificationContent()
        content.title = "Pawer Alert"
        content.body = "Battery is \(batteryLevel)%. Time to unplug 🐾"
        content.sound = .default
        
        let request = UNNotificationRequest(
            identifier: "pawer-alert",
            content: content,
            trigger: nil
        )
        
        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("Failed to send notification: \(error)")
            }
        }
    }
}