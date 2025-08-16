import Foundation

class TgBinding: ObservableObject {
    static let shared = TgBinding()

    let webhookBaseURL = "tight-constantly-gibbon.ngrok-free.app"
    private let botUsername = "pawerapp_bot"
    let botLinkURL: URL?
    let uniqueID: String

    enum LinkedStatus {
        case unknown
        case linked
        case unlinked
        case error
    }
    @Published var linkedStatus: LinkedStatus = .unknown

    enum ConnectionState {
      case idle
      case waitingForTelegram
      case failed
    }
    enum UnlinkResult {
        case success
        case failed
    }
    @Published var unlinkResult: UnlinkResult?

    private var webSocketTask: URLSessionWebSocketTask?
    @Published var connectionState: ConnectionState = .idle


    private init() {
        self.uniqueID = TgBinding.getOrCreateUniqueID()
        self.botLinkURL = URL(string: "https://t.me/\(botUsername)?start=\(uniqueID)")
        checkLinkingStatus()
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

    func connectWebSocket() {
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

                if text.contains("\"type\":\"listening_confirmed\"") {
                    DispatchQueue.main.async {
                        self.connectionState = .waitingForTelegram
                    }
                    return
                } 
                
               if text.contains("\"type\":\"linked\"") {
                    DispatchQueue.main.async {
                        self.linkedStatus = .linked
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
            DispatchQueue.main.async {
                self.connectionState = .failed
            }
        }
    }

    func unlinkTelegram() {
        let url = URL(string: "https://\(webhookBaseURL)/unlink/\(uniqueID)")!

        var request = URLRequest (url: url)
        request.httpMethod = "DELETE"
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                DispatchQueue.main.async {
                    self.unlinkResult = .failed
                    print("unlinkTelegram: \(error)")
                }
                return
            }

            guard let httpResponse = response as? HTTPURLResponse else {
                DispatchQueue.main.async {
                    self.unlinkResult = .failed
                }
                return
            }

            DispatchQueue.main.async {
                if httpResponse.statusCode == 204 {
                    self.unlinkResult = .success
                    self.linkedStatus = .unlinked
                    UserDefaults.standard.set(false, forKey: "is_telegram_linked")
                } else {
                    self.unlinkResult = .failed
                }
            }
        }.resume()
    }

    func checkLinkingStatus() {
        let url = URL(string: "https://\(webhookBaseURL)/is_linked/\(uniqueID)")!

        URLSession.shared.dataTask(with: url) { data, response, error in
            if let error = error {
                DispatchQueue.main.async {
                    print("checkLinkingStatus: \(error)")
                    self.linkedStatus = .error
                }
                return
            }

            guard let httpResponse = response as? HTTPURLResponse else {
                DispatchQueue.main.async {
                    self.linkedStatus = .error
                }
                return
            }

            DispatchQueue.main.async {
                switch httpResponse.statusCode {
                case 200:
                    self.linkedStatus = .linked
                    UserDefaults.standard.set(true, forKey: "is_telegram_linked")
                case 404:
                    self.linkedStatus = .unlinked
                    UserDefaults.standard.set(false, forKey: "is_telegram_linked")
                default:
                    self.linkedStatus = .error
                    print("❌ DEBUG: Unexpected status code: \(httpResponse.statusCode)")
                }
            }
        }.resume()
    }

}
