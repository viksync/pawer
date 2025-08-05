import Foundation

class TgBinding: ObservableObject {
    static let shared = TgBinding()

    private let webhookBaseURL = "f4cc6d1ca003.ngrok-free.app"
    private let botUsername = "pawerapp_bot"

    let botLinkURL: URL?
    private let uniqueID: String
    @Published var isLinked: Bool
    @Published var linkedStatusLoading: Bool = true

    enum ConnectionState {
      case idle
      case waitingForTelegram
      case failed
    }

    private var webSocketTask: URLSessionWebSocketTask?
    @Published var connectionState: ConnectionState = .idle

    private init() {
        self.uniqueID = TgBinding.getOrCreateUniqueID()
        self.botLinkURL = URL(string: "https://t.me/\(botUsername)?start=\(uniqueID)")

        if UserDefaults.standard.object(forKey: "is_telegram_linked") != nil {
            self.isLinked = UserDefaults.standard.bool(forKey: "is_telegram_linked")
            checkLinkingStatus()
        } else {
            self.isLinked = false
            self.linkedStatusLoading = false
        }
    }

    private static func getOrCreateUniqueID() -> String {
        let key = "uuid_telegram"

        if let existingID = UserDefaults.standard.string(forKey: key) {
              return existingID
        }

        let newID = UUID().uuidString
        UserDefaults.standard.set(newID, forKey: key)
        return newID
    }

    func connectTelegram() {
        connectWebSocket()
    }

    private func connectWebSocket() {
        let wsURL = URL(string: "wss://\(webhookBaseURL)/ws")!

        webSocketTask = URLSession.shared.webSocketTask(with: wsURL)
        webSocketTask?.resume()
        receiveWebSocketMessage()

        print("WebSocket connecting to: \(wsURL)")

        sendRegistrationMessage()
    }

    private func receiveWebSocketMessage() {
        webSocketTask?.receive { result in
            switch result {
                case .success(let message):
                    self.handleWebSocketMessage(message)
                    self.receiveWebSocketMessage()
                case .failure(let error):
                    print("WebSocket receive error: \(error)")
                    DispatchQueue.main.async {
                        self.connectionState = .failed
                    }
            }
        }
    }

    private func handleWebSocketMessage(_ message: URLSessionWebSocketTask.Message) {
        switch message {
            case .string(let text):
                print("📡 Received: \(text)")

                if text.contains("\"type\": \"listening_confirmed\"") {
                    DispatchQueue.main.async {
                        self.connectionState = .waitingForTelegram
                    }
                    return
                } 
                
               if text.contains("\"type\": \"linked\"") {
                    DispatchQueue.main.async {
                        self.isLinked = true
                        self.connectionState = .idle
                        UserDefaults.standard.set(true, forKey: "is_telegram_linked")

                        self.webSocketTask?.cancel(with: .goingAway, reason: nil)
                        self.webSocketTask = nil
                        print("🔌 WebSocket disconnected")
                    }
                    return
                }

            case .data(let data):
                print("📡 Received data: \(data)")
            @unknown default:
                break
            }
    }

    private func sendRegistrationMessage() {
        let message = ["type": "listen_for_link", "unique_id": uniqueID]

        do {
            let jsonData = try JSONSerialization.data(withJSONObject: message)
            let jsonString = String(data: jsonData, encoding: .utf8)!

            let wsMessage = URLSessionWebSocketTask.Message.string(jsonString)

            webSocketTask?.send(wsMessage) { error in
                if let error = error {
                    print("❌ Failed to send registration: \(error)")
                    DispatchQueue.main.async {
                        self.connectionState = .failed
                    }
                } else {
                    print("✅ Registration sent successfully")
              }
            }
        } catch {
            print("❌ JSON serialization failed: \(error)")
            connectionState = .failed
        }
    }

    func checkLinkingStatus() {
        guard let url = URL(string: "https://\(webhookBaseURL)/is_linked/\(uniqueID)")
        else {
            print("Invalid URL for checking linking status")
            return
        }

        URLSession.shared.dataTask(with: url) { data, response, error in
            if let error = error {
                print("checkLinkingStatus: \(error)")
                return
            }

            guard let data = data
            else {
                print("checkLinkingStatus: no data received")
                return
            }

            do {
                if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                let linked = json["linked"] as? Bool {

                    DispatchQueue.main.async {
                        self.isLinked = linked
                        UserDefaults.standard.set(linked, forKey: "is_telegram_linked")
                    }
                }
            } catch {
                print("checkLinkingStatus: \(error)")
            }
        }.resume()
    }

}
