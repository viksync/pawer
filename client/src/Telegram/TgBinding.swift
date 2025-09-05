import Foundation

class TgBinding: ObservableObject {
    static let shared = TgBinding()

    enum LinkedStatus {
        case linked
        case unlinked
    }

    enum ConnectionState {
        case idle
        case waitingForTelegram
        case failed
    }

    let botLinkURL: URL?

    @Published var connectionState: ConnectionState = .idle
    @Published var chatID: String?

    var linkedStatus: LinkedStatus {
        chatID != nil ? .linked : .unlinked 
    }

    private let botUsername = "pawerapp_bot"
    private let webhookBaseURL = "pawer-server.onrender.com"
    private let wsURL: URL
    private let uniqueID: String
    private var webSocketTask: URLSessionWebSocketTask?

    private init() {
        self.uniqueID = TgBinding.getOrCreateUniqueID()
        self.chatID = UserDefaults.standard.string(forKey: "telegram_chat_id")
        self.botLinkURL = URL(string: "https://t.me/\(botUsername)?start=\(uniqueID)")
        self.wsURL = URL(string: "wss://\(webhookBaseURL)/websocket")!
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
        webSocketTask = URLSession.shared.webSocketTask(with: wsURL)
        receiveWebSocketMessage()
        webSocketTask?.resume()
        print("WebSocket connecting to: \(wsURL)")
        sendRegistrationMessage()
    }

    func unlinkTelegram() {
        self.chatID = nil
    }

    private func receiveWebSocketMessage() {
        webSocketTask?.receive { result in
            switch result {
                case .success(let message):
                    self.handleWebSocketMessage(message)
                    self.receiveWebSocketMessage()
                case .failure(let error):
                    print("WebSocket error: \(error)")
                    DispatchQueue.main.async {
                        self.connectionState = .failed
                        disconnect()
                    }
            }
        }
    }

    private func handleWebSocketMessage(_ message: URLSessionWebSocketTask.Message) {
        switch message { 
            case .string(let text):
                print("📡 Received: \(text)")

                if text == "server_waiting" {
                    DispatchQueue.main.async {
                        self.connectionState = .waitingForTelegram
                    }
                    return
                } 
                
               if text.hasPrefix("linked_chatId:") {
                    DispatchQueue.main.async {
                        self.chatID = String(text.dropFirst(14))
                        self.connectionState = .idle
                        UserDefaults.standard.set(self.chatID, forKey: "telegram_chat_id")

                        disconnect()
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
        let message = "register:\(uniqueID)"
        let wsMessage = URLSessionWebSocketTask.Message.string(message)

        webSocketTask?.send(wsMessage) { error in
            if let error = error {
                print("❌ Failed to send registration: \(error)")
                DispatchQueue.main.async {
                    self.connectionState = .failed
                    disconnect()
                }
            } else {
                print("✅ Registration sent successfully")
            }
        }
    }

    private func disconnect() {
        webSocketTask?.cancel(with: .goingAway, reason: nil)
        webSocketTask = nil
        print("🔌 WebSocket disconnected")
    }
 }
