import Foundation

class TgNotifications {
    static let shared = TgNotifications()

    func sendBatteryAlert(batteryLevel: Int) {
        
        guard let chatID = TgBinding.shared.chatID else {
            print("❌ Telegram not linked, skipping notification (status: \(TgBinding.shared.linkedStatus))")
            return
        }

        let message = "🔋 Battery: \(batteryLevel)%. Time to unplug!"

        let url = URL(string: "https://\(TgBinding.shared.webhookBaseURL)/notify")!

        var request = URLRequest (url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let payload = [
            "chat_id": TgBinding.shared.chatID,
            "message": message
        ]

        do {
            let jsonData = try JSONSerialization.data(withJSONObject: payload)
            request.httpBody = jsonData
            
            URLSession.shared.dataTask(with: request) { data, response, error in 
                if let error = error {
                    print("❌ TgNotifications.sendBatteryAlert error: \(error)")
                    return
                }

                if let httpResponse = response as? HTTPURLResponse {
                    print("✅ Telegram notification response: \(httpResponse.statusCode)")
                    
                    if let data = data, let responseString = String(data: data, encoding: .utf8) {
                        print("📄 Response body: \(responseString)")
                    }
                    
                    if httpResponse.statusCode != 200 {
                        print("❌ HTTP Error: \(httpResponse.statusCode)")
                    }
                } else {
                    print("❌ No HTTP response received")
                }
            }.resume()
        } catch {
            print("Failed to serialize notification payload: \(error)")
        }

    }

}
