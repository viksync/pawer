import Foundation

class TgNotifications {
    static let shared = TgNotifications()

    private init() {

    }

    func sendBatteryAlert(batteryLevel: Int) {
        guard TgBinding.shared.linkedStatus == .linked else {
            print("Telegram not linked, skipping notification")
            return
        }

        guard UserDefaults.standard.bool(forKey: "isTelegramEnabled") else {
            return
        }

        let message = "🔋 Battery: \(batteryLevel)%. Time to unplug!"

        let url = URL(string: "https://\(TgBinding.shared.webhookBaseURL)/notify")!

        var request = URLRequest (url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let payload = [
            "unique_id": TgBinding.shared.uniqueID,
            "message": message
        ]

        do {
            let jsonData = try JSONSerialization.data(withJSONObject: payload)
            request.httpBody = jsonData
            
            URLSession.shared.dataTask(with: request) { data, response, error in 
                if let error = error {
                    print("TgNotifications.sendBatteryAlert: \(error)")
                }

                if let httpResponse = response as? HTTPURLResponse {
                    print("Telegram notification response: \(httpResponse.statusCode)")
                }
            }.resume()
        } catch {
            print("Failed to serialize notification payload: \(error)")
        }

    }

}
